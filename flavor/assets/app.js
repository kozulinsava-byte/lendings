/* ============================================================
   Вкусовой атлас — логика
   Один экран: две кнопки, карточка сочетания, каталоги.
   Данные: assets/data/*.js (window.FA)
   ============================================================ */

(function () {
  "use strict";

  const FA = window.FA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const low = (s) => s.charAt(0).toLowerCase() + s.slice(1);

  /* ---------- индексы ---------- */

  const BY_ID = {};
  FA.ING.forEach((r) => {
    BY_ID[r[0]] = { id: r[0], name: r[1], latin: r[2], cat: r[3], tastes: r[4], price: r[5], season: r[6], tags: r[7], note: r[8] };
  });

  const EDGES = new Map();
  const ADJ = {};
  FA.ING.forEach((r) => (ADJ[r[0]] = []));
  Object.keys(FA.PAIRS).forEach((anchor) => {
    FA.PAIRS[anchor].split(" ").forEach((token) => {
      const [id, w, code] = token.split(":");
      if (!BY_ID[anchor] || !BY_ID[id]) return;
      const key = anchor < id ? anchor + "|" + id : id + "|" + anchor;
      const prev = EDGES.get(key);
      if (!prev || prev.w < +w) EDGES.set(key, { a: anchor, b: id, w: +w, code });
      ADJ[anchor].push({ id, w: +w, code });
      ADJ[id].push({ id: anchor, w: +w, code });
    });
  });
  Object.values(ADJ).forEach((list) => list.sort((x, y) => y.w - x.w));

  const edge = (a, b) => EDGES.get(a < b ? a + "|" + b : b + "|" + a) || null;
  const name = (id) => (BY_ID[id] ? BY_ID[id].name : id);
  const catOf = (id) => FA.CATS[BY_ID[id].cat] || { name: "", short: "" };

  /* ---------- картинки ---------- */

  const img = (id) => `<img src="assets/img/ing/${id}.jpg" alt="${esc(name(id))}" loading="lazy" decoding="async">`;

  function fallbackImages(root) {
    $$("img", root).forEach((el) => {
      el.addEventListener("error", () => {
        const box = el.closest(".shot, .tile__pic, .trio__pics, .ing__pic");
        if (!box) return;
        const id = (el.getAttribute("src") || "").split("/").pop().replace(".jpg", "");
        el.remove();
        box.insertAdjacentHTML("afterbegin", `<span class="shot__letter">${esc((BY_ID[id] ? BY_ID[id].name : id).charAt(0))}</span>`);
      });
    });
  }

  /* ---------- выборка ---------- */

  function sample(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function pickCombo(opts) {
    const count = opts.count || 3;
    const mode = opts.mode || "balance";
    const min = mode === "classic" ? 3 : mode === "bold" ? 1 : 2;
    let pool = FA.ING.map((r) => r[0]);
    if (opts.noMeat) pool = pool.filter((id) => BY_ID[id].cat !== "meat");
    if (opts.noFish) pool = pool.filter((id) => BY_ID[id].cat !== "fish");
    if (opts.must) pool = pool.filter((id) => id !== opts.must);
    const cheap = opts.budget === "eco";
    const pricey = opts.budget === "premium";

    for (let attempt = 0; attempt < 700; attempt++) {
      let startPool = pool;
      if (pricey) {
        const p = pool.filter((id) => BY_ID[id].price === 3);
        if (p.length >= 5) startPool = p;
      }
      if (cheap) {
        const p = pool.filter((id) => BY_ID[id].price === 1);
        if (p.length >= 10) startPool = p;
      }
      const combo = [opts.must ? opts.must : sample(startPool)];
      let guard = 0;
      while (combo.length < count && guard++ < 60) {
        const usedCats = new Set(combo.map((id) => BY_ID[id].cat));
        let cands = pool.filter((id) => !combo.includes(id) && combo.every((c) => {
          const e = edge(c, id);
          return e && e.w >= min;
        }));
        if (!cands.length) break;
        if (combo.length >= 2) {
          const diverse = cands.filter((id) => !usedCats.has(BY_ID[id].cat));
          if (diverse.length) cands = diverse;
        }
        const scored = cands.map((id) => {
          let s = 1;
          combo.forEach((c) => {
            const e = edge(c, id);
            s += mode === "bold" ? (4 - e.w) * 2 : e.w * 2;
          });
          if (cheap) s += (4 - BY_ID[id].price) * 2;
          if (pricey) s += BY_ID[id].price * 2;
          return { id, s };
        });
        const total = scored.reduce((a, b) => a + b.s, 0);
        let r = Math.random() * total;
        let pick = scored[scored.length - 1].id;
        for (const it of scored) { r -= it.s; if (r <= 0) { pick = it.id; break; } }
        combo.push(pick);
      }
      if (combo.length === count) return combo;
    }
    const combo = [opts.must || sample(pool)];
    while (combo.length < count) {
      const next = (ADJ[combo[combo.length - 1]] || []).filter((x) => !combo.includes(x.id));
      if (!next.length) break;
      combo.push(sample(next).id);
    }
    return combo;
  }

  function whyPairs(combo) {
    const out = [];
    for (let i = 0; i < combo.length; i++) {
      for (let j = i + 1; j < combo.length; j++) {
        const e = edge(combo[i], combo[j]);
        if (e) out.push({ a: combo[i], b: combo[j], w: e.w, code: e.code });
      }
    }
    return out.sort((x, y) => y.w - x.w);
  }

  function comboUse(combo) {
    const ids = [...combo].sort().join("|");
    const trio = FA.TRIOS.find((t) => [...t.ids].sort().join("|") === ids);
    if (trio) return trio.note;
    const cats = combo.map((id) => BY_ID[id].cat);
    if (cats.includes("fish")) return "Быстрый жар или запекание, кислоту и зелень добавляйте в конце.";
    if (cats.includes("meat")) return "Сильный жар до корочки, отдых под фольгой, кислота — в соус.";
    if (cats.filter((c) => c === "fruit").length >= 2) return "Салат или десерт: соль и кислота держат сладость.";
    if (cats.includes("grain")) return "Тёплая основа: специи обжарить в масле и собрать всё вместе.";
    return "Собрать в одной сковороде или в салате — кислоту добавляйте в конце.";
  }

  const ROLE = {
    veg: "свежесть", fruit: "сладость", herb: "зелёный аромат", spice: "пряность",
    dairy: "сливочность", meat: "плотность", fish: "морской вкус", grain: "тёплую основу",
    nut: "хруст", sweet: "десертную ноту", sauce: "кислоту", drink: "аромат"
  };

  function story(combo) {
    const top = whyPairs(combo)[0];
    if (!top) return "Продукты связаны через общие ноты.";
    const detail = FA.WHY[[top.a, top.b].sort().join("|")];
    const reason = FA.REASONS[top.code] ? FA.REASONS[top.code].label : "";
    const head = detail
      ? `${cap(low(name(top.a)))} и ${low(name(top.b))} — ${reason}: ${detail}.`
      : `${cap(low(name(top.a)))} и ${low(name(top.b))} — ${reason || "проверенная пара"}.`;

    // у готового трио есть собственное описание — второй абзац не нужен
    const known = FA.TRIOS.find((t) => [...t.ids].sort().join("|") === [...combo].sort().join("|"));
    if (known) return `${head} ${known.note}`;

    const rest = combo.filter((id) => id !== top.a && id !== top.b);
    const extra = rest.map((id) => `${cap(low(name(id)))} добавляет ${ROLE[BY_ID[id].cat] || "свой характер"}.`).join(" ");
    return `${head}${extra ? " " + extra : ""} ${comboUse(combo)}`;
  }

  /* ---------- рендер сочетания ---------- */

  function renderCombo(combo, opts = {}) {
    const shots = $("#shots");
    if (!shots) return;
    shots.style.setProperty("--n", String(combo.length));
    shots.dataset.n = String(combo.length);
    shots.innerHTML = combo.map((id) => `
      <div class="shot-wrap">
        <div class="shot">${img(id)}</div>
        <span class="shot__name">${esc(name(id))}</span>
      </div>`).join("");

    $("#comboTitle").textContent = combo.map(name).join(" · ");
    $("#comboDesc").textContent = story(combo);
    fallbackImages(shots);

    const url = new URL(location.href);
    url.searchParams.set("c", combo.join(","));
    try { history.replaceState(null, "", url); } catch { /* file:// */ }

    if (opts.scroll) $("#result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- экраны ---------- */

  function showView(which) {
    const start = $("#viewStart");
    const settings = $("#viewSettings");
    if (!start || !settings) return;
    start.hidden = which !== "start";
    settings.hidden = which !== "settings";
  }

  function initHome() {
    const state = { count: 3, budget: "any", mode: "balance", noMeat: false, noFish: false };

    $("#btnRandom").addEventListener("click", () => {
      renderCombo(pickCombo({ count: 3, mode: "balance" }), { scroll: true });
    });

    $("#btnSettings").addEventListener("click", () => {
      showView("settings");
      $("#viewSettings").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    $("#btnBack").addEventListener("click", () => showView("start"));

    $$("[data-count]").forEach((b) => b.addEventListener("click", () => {
      state.count = +b.dataset.count;
      $$("[data-count]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    }));
    $$("[data-budget]").forEach((b) => b.addEventListener("click", () => {
      state.budget = b.dataset.budget;
      $$("[data-budget]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    }));
    $$("[data-exclude]").forEach((b) => b.addEventListener("click", () => {
      const on = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", String(on));
      state[b.dataset.exclude] = on;
    }));

    $("#btnApply").addEventListener("click", () => {
      renderCombo(pickCombo(state), { scroll: true });
    });

    $("#btnAgain").addEventListener("click", () => {
      renderCombo(pickCombo(state), { scroll: true });
    });

    $("#btnCopy").addEventListener("click", async (e) => {
      try {
        await navigator.clipboard.writeText(location.href);
        const b = e.currentTarget;
        const old = b.textContent;
        b.textContent = "Ссылка скопирована";
        setTimeout(() => { b.textContent = old; }, 1600);
      } catch { /* игнорируем */ }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "r" || e.key === "R" || e.key === "к" || e.key === "К") {
        if (e.target.matches("input, textarea")) return;
        renderCombo(pickCombo(state), { scroll: true });
      }
    });

    const params = new URLSearchParams(location.search);
    const c = params.get("c");
    if (c) {
      const ids = c.split(",").filter((id) => BY_ID[id]);
      if (ids.length >= 2) { renderCombo(ids); if (params.get("view") === "settings") showView("settings"); return; }
    }
    const withId = params.get("with");
    if (withId && BY_ID[withId]) { renderCombo(pickCombo({ count: 3, must: withId })); return; }
    renderCombo(["tomato", "basil", "mozzarella"]);
    if (params.get("view") === "settings") showView("settings");
  }

  /* ---------- атлас ---------- */

  function initAtlas() {
    const grid = $("#atlasGrid");
    if (!grid) return;
    const search = $("#atlasSearch");
    const chips = $("#atlasCats");
    let activeCat = "all";

    const cats = [["all", "Все"], ...Object.entries(FA.CATS).map(([k, v]) => [k, v.short || v.name])];
    chips.innerHTML = cats.map(([k, label]) =>
      `<button class="pill" data-cat="${k}" aria-pressed="${k === "all"}">${esc(label)}</button>`).join("");

    function draw() {
      const q = (search.value || "").trim().toLowerCase();
      const list = FA.ING.filter((r) => {
        const it = BY_ID[r[0]];
        if (activeCat !== "all" && it.cat !== activeCat) return false;
        if (!q) return true;
        return (it.name + " " + it.latin + " " + it.tags + " " + it.note).toLowerCase().includes(q);
      });
      grid.innerHTML = list.map((r) => {
        const it = BY_ID[r[0]];
        return `<button class="tile" data-id="${it.id}">
          <div class="tile__pic">${img(it.id)}</div>
          <b>${esc(it.name)}</b><span>${esc(catOf(it.id).name)}</span>
        </button>`;
      }).join("") || `<p class="empty">Ничего не нашлось — попробуйте другое слово.</p>`;
      fallbackImages(grid);
    }

    chips.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-cat]");
      if (!b) return;
      activeCat = b.dataset.cat;
      $$("button[data-cat]", chips).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      draw();
    });
    search.addEventListener("input", draw);
    grid.addEventListener("click", (e) => {
      const card = e.target.closest(".tile[data-id]");
      if (card) openIngredient(card.dataset.id);
    });
    draw();

    const params = new URLSearchParams(location.search);
    if (params.get("id") && BY_ID[params.get("id")]) openIngredient(params.get("id"));
  }

  const TASTES = ["сладость", "кислота", "горечь", "соль", "умами", "жар", "аромат"];

  function openIngredient(id) {
    const dlg = $("#dlgIngredient");
    const it = BY_ID[id];
    if (!dlg || !it) return;
    const partners = (ADJ[id] || []).slice(0, 8);

    $("#ingBody").innerHTML = `
      <div class="ing">
        <div class="ing__pic">${img(id)}</div>
        <div>
          <h2>${esc(it.name)}</h2>
          <div class="latin">${esc(it.latin)}</div>
          <p class="note">${esc(it.note)}</p>
          <div class="meters">
            ${it.tastes.map((v, i) => `
              <div class="meter-row"><span>${TASTES[i]}</span><span class="meter"><i style="width:${(v / 3) * 100}%"></i></span></div>`).join("")}
          </div>
          <p class="meta">${esc(catOf(id).name)} · ${esc(it.season)}</p>
          ${partners.length ? `<div class="partners">${partners.map((p) =>
            `<button data-partner="${p.id}">${esc(name(p.id))}</button>`).join("")}</div>` : ""}
          <div style="margin-top:18px">
            <a class="btn btn-primary btn-sm" href="index.html?with=${encodeURIComponent(id)}">Собрать сочетание с ним</a>
          </div>
        </div>
      </div>`;
    fallbackImages(dlg);
    $("#ingBody").onclick = (e) => {
      const b = e.target.closest("button[data-partner]");
      if (b) openIngredient(b.dataset.partner);
    };
    if (!dlg.open) dlg.showModal();
    $(".close", dlg).onclick = () => dlg.close();
    dlg.onclick = (e) => { if (e.target === dlg) dlg.close(); };
  }

  /* ---------- трио ---------- */

  function initCombos() {
    const grid = $("#comboGrid");
    if (!grid) return;
    grid.innerHTML = FA.TRIOS.map((t) => `
      <article class="trio">
        <div class="trio__pics">${t.ids.map((id) => img(id)).join("")}</div>
        <h3>${esc(t.name)}</h3>
        <p>${esc(t.note)}</p>
      </article>`).join("");
    fallbackImages(grid);
  }

  /* ---------- лицензии фото ---------- */

  async function initCredits() {
    const box = $("#credits");
    if (!box) return;
    try {
      const data = await (await fetch("assets/img/manifest.json")).json();
      box.innerHTML = Object.entries(data)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([id, m]) => {
          const title = m.label || m.file || id;
          const link = m.page ? `<a href="${esc(m.page)}" target="_blank" rel="noopener">${esc(title)}</a>` : esc(title);
          return `<li><b>${esc(name(id))}</b> — ${link}, ${esc(m.license || "")}${m.author ? ", " + esc(m.author) : ""}</li>`;
        }).join("");
    } catch {
      box.innerHTML = `<li>Список не загрузился.</li>`;
    }
  }

  /* ---------- запуск ---------- */

  document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page;
    if (page === "home") initHome();
    if (page === "atlas") initAtlas();
    if (page === "combos") initCombos();
    if (page === "method") initCredits();
  });
})();
