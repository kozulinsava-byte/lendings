#!/usr/bin/env node
/**
 * deploy.mjs — публикация портфолио на GitHub Pages.
 *
 * Git и gh CLI не требуются: скрипт работает через GitHub REST API
 * на чистом Node.js (18+).
 *
 * Запуск:
 *   node deploy.mjs --user <ник> --repo <репозиторий> --token <токен>
 *
 * Или через переменные окружения:
 *   GITHUB_USER, GITHUB_REPO, GITHUB_TOKEN  →  node deploy.mjs
 *
 * Токен: GitHub → Settings → Developer settings → Personal access tokens →
 *        Fine-grained tokens → доступ только к репозиторию, Contents: Read and write.
 *
 * Флаги:
 *   --dry-run   показать, что будет загружено, ничего не отправляя
 *   --public    сделать репозиторий публичным (по умолчанию приватный)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

/* ---------------- аргументы ---------------- */
function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    if (key.startsWith('no-')) { out[key.slice(3)] = false; continue; }
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) { out[key] = next; i++; }
    else out[key] = true;
  }
  return out;
}

const args = parseArgs(process.argv);
const DRY = !!args['dry-run'];
const TOKEN = args.token || process.env.GITHUB_TOKEN || '';
const REPO_NAME = args.repo || process.env.GITHUB_REPO || 'lendings';
const MAKE_PUBLIC = !!args.public;

const IGNORE = new Set(['.git', 'node_modules', '.github', '.DS_Store', 'deploy.mjs']);

/* ---------------- сбор файлов ---------------- */
function collect(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collect(full, base));
    else out.push({ rel: path.relative(base, full).split(path.sep).join('/'), full });
  }
  return out;
}

const files = collect(ROOT).sort((a, b) => a.rel.localeCompare(b.rel));
const totalBytes = files.reduce((s, f) => s + fs.statSync(f.full).size, 0);

console.log('Файлов к загрузке:', files.length, '·', (totalBytes / 1048576).toFixed(1), 'МБ');
if (DRY) {
  files.forEach(f => console.log('  ', f.rel));
  console.log('\nРежим --dry-run: ничего не отправлено.');
  process.exit(0);
}

if (!TOKEN) {
  console.error('\n Не найден токен.\n');
  console.error(' Создай Fine-grained token:');
  console.error('   GitHub → Settings → Developer settings → Personal access tokens');
  console.error('   → Generate new token → выбери свой репозиторий → Contents: Read and write\n');
  console.error(' Затем выполни:');
  console.error('   node deploy.mjs --user <ник> --repo <имя-репозитория> --token <токен>\n');
  process.exit(1);
}

/* ---------------- GitHub API ---------------- */
const API = 'https://api.github.com';
const auth = { Authorization: `Bearer ${TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28' };

async function api(method, endpoint, body) {
  const res = await fetch(API + endpoint, {
    method,
    headers: {
      ...auth,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'lendings-deploy',
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const msg = data.message || res.statusText;
    const err = new Error(`${method} ${endpoint} → ${res.status}: ${msg}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

/* пул с ограничением параллелизма */
async function pool(items, limit, worker) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await worker(items[idx], idx);
    }
  }));
  return out;
}

const isText = f => /\.(html|css|js|json|md|txt|xml|svg|webmanifest|nojekyll)$/i.test(f);

async function main() {
  /* 1. кто мы */
  const me = await api('GET', '/user');
  const owner = args.user || me.login;
  if (owner !== me.login) {
    console.log('Внимание: --user =', owner, ', а токен принадлежит', me.login);
  }
  console.log('Аккаунт:', me.login);

  /* 2. репозиторий */
  let repo;
  try {
    repo = await api('GET', `/repos/${owner}/${REPO_NAME}`);
    console.log(`Репозиторий ${owner}/${REPO_NAME} найден`);
  } catch (e) {
    if (e.status !== 404) throw e;
    repo = await api('POST', '/user/repos', {
      name: REPO_NAME,
      private: !MAKE_PUBLIC,
      description: 'Портфолио лендингов и готовые лендинги',
      auto_init: false
    });
    console.log(`Репозиторий ${owner}/${REPO_NAME} создан`);
  }
  if (!MAKE_PUBLIC && repo.private === false) {
    console.log('Репозиторий публичный — ок для GitHub Pages');
  }

  /* 3. текущий коммит ветки gh-pages (если есть) */
  const BRANCH = 'gh-pages';
  let baseCommit = null;
  try {
    const ref = await api('GET', `/repos/${owner}/${REPO_NAME}/git/ref/heads/${BRANCH}`);
    const sha = ref.object.sha;
    const commit = await api('GET', `/repos/${owner}/${REPO_NAME}/git/commits/${sha}`);
    baseCommit = commit.sha;
    console.log('Ветка', BRANCH, 'найдена, база:', sha.slice(0, 8));
  } catch (e) {
    if (e.status !== 404) throw e;
    console.log('Ветка', BRANCH, 'ещё не существует — создаём с нуля');
  }

  /* 4. файлы → блобы */
  console.log('Загружаю объекты...');
  const blobs = await pool(files, 6, async (f) => {
    const buf = fs.readFileSync(f.full);
    const payload = (isText(f.rel) || buf.length === 0)
      ? { content: buf.toString('utf8'), encoding: 'utf-8' }
      : { content: buf.toString('base64'), encoding: 'base64' };
    const blob = await api('POST', `/repos/${owner}/${REPO_NAME}/git/blobs`, payload);
    return { path: f.rel, mode: '100644', type: 'blob', sha: blob.sha };
  });
  console.log('  объектов создано:', blobs.length);

  /* 5. дерево */
  const tree = await api('POST', `/repos/${owner}/${REPO_NAME}/git/trees`, {
    base_tree: baseCommit || undefined,
    tree: blobs
  });
  console.log('  дерево:', tree.sha.slice(0, 8), '· предупреждений:', (tree.warnings || []).length);

  /* 6. коммит */
  const commit = await api('POST', `/repos/${owner}/${REPO_NAME}/git/commits`, {
    message: `Обновление портфолио: ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
    tree: tree.sha,
    parents: baseCommit ? [baseCommit] : []
  });
  console.log('  коммит:', commit.sha.slice(0, 8));

  /* 7. обновить ветку */
  try {
    await api('PATCH', `/repos/${owner}/${REPO_NAME}/git/refs/heads/${BRANCH}`, {
      sha: commit.sha,
      force: true
    });
  } catch (e) {
    if (e.status !== 422) throw e;
    await api('POST', `/repos/${owner}/${REPO_NAME}/git/refs`, {
      ref: `refs/heads/${BRANCH}`,
      sha: commit.sha
    });
  }
  console.log('  ветка обновлена');

  /* 8. включить Pages */
  try {
    await api('POST', `/repos/${owner}/${REPO_NAME}/pages`, {
      source: { branch: BRANCH, path: '/' }
    });
    console.log('  GitHub Pages включён');
  } catch (e) {
    if (e.status === 409 || e.status === 422) {
      console.log('  GitHub Pages уже настроен — оставляем как есть');
    } else throw e;
  }

  /* 9. проверить */
  let url = `https://${owner}.github.io/${repo.name}/`;
  for (let i = 0; i < 12; i++) {
    try {
      const pages = await api('GET', `/repos/${owner}/${REPO_NAME}/pages`);
      if (pages.html_url) { url = pages.html_url; }
      if (pages.status === 'built') break;
    } catch { /* pages может быть ещё не активирован */ }
    await new Promise(r => setTimeout(r, 5000));
    process.stdout.write('.');
  }
  console.log('\n\nГотово. Сайт: ' + url);
  console.log('Первый запуск занимает до минуты. Если страница не открылась — подожди и перезагрузи.');
}

main().catch((e) => {
  console.error('\nОшибка:', e.message);
  if (e.status === 401) console.error('Токен недействителен или истёк.');
  if (e.status === 403) console.error('Не хватает прав. Проверь, что токен выдан на запись в репозитории.');
  if (e.status === 404) console.error('Репозиторий не найден или нет доступа к нему.');
  process.exit(1);
});