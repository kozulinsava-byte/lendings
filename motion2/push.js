const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const GIT = 'C:\\Users\\user\\AppData\\Local\\GitHubDesktop\\app-3.5.8\\resources\\app\\git\\cmd\\git.exe';
const ROOT = 'Z:\\лендинги';
const OWNER = 'kozulinsava-byte';
const REPO = 'lendings';

function ask(user) {
  for (let i = 0; i < 6; i++) {
    const r = spawnSync(GIT, ['credential', 'fill'], {
      input: `protocol=https\nhost=github.com\nusername=${user}\npath=\n\n`,
      encoding: 'utf8', timeout: 20000,
    });
    const l = (r.stdout || '').split(/\r?\n/).find(x => x.startsWith('password='));
    if (l) return l.slice(9).trim();
  }
  return null;
}

const token = ask(OWNER);
if (!token) { console.error('Токен для ' + OWNER + ' не найден'); process.exit(1); }

const sh = (args, allowFail) => {
  const r = spawnSync(GIT, args, { cwd: ROOT, encoding: 'utf8', timeout: 180000 });
  if (r.status !== 0 && !allowFail) {
    console.error('git ' + args.join(' ') + ' → ' + ((r.stderr || r.stdout || '').trim().split('\n')[0]));
    process.exit(1);
  }
  return (r.stdout || '').trim();
};

sh(['add', '-A']);
const c = spawnSync(GIT, ['commit', '-q', '-m', 'Ролик: озвучка, микс, бриф, пакет'],
  { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
console.log(c.status === 0 ? '  коммит создан' : '  изменений нет');

spawnSync(GIT, ['remote', 'set-url', 'origin',
  `https://${OWNER}:${token}@github.com/${OWNER}/${REPO}.git`], { cwd: ROOT });
sh(['push', '--force', 'origin', 'gh-pages']);
spawnSync(GIT, ['remote', 'set-url', 'origin',
  `https://github.com/${OWNER}/${REPO}.git`], { cwd: ROOT });

const cfg = fs.readFileSync(path.join(ROOT, '.git', 'config'), 'utf8');
console.log('  токен в .git/config:', /https:\/\/[^@\s]+@/.test(cfg) ? 'ЕСТЬ' : 'убран ✓');
console.log('  ' + sh(['log', '--oneline', '-1']));