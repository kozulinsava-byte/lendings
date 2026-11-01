/* ============================================================
   Вкусовой атлас — логика
   Цель → сочетание. Данные: assets/data/*.js (window.FA)
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
        const box = el.closest(".shot__pic, .purpose, .tile__pic, .trio__pics, .ing__pic");
        if (!box) return;
        const id = (el.getAttribute("src") || "").split("/").pop().replace(".jpg", "");
        el.remove();
        box.insertAdjacentHTML("afterbegin", `<span class="shot__letter">${esc((BY_ID[id] ? BY_ID[id].name : id).charAt(0))}</span>`);
      });
    });
  }

  /* ---------- выборка ---------- */

  function sample(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function purposePool(purposeId, opts) {
    const rule = FA.PURPOSE_RULES[purposeId];
    const allowed = new Set(rule.cats);
    let pool = FA.ING.map((r) => r[0]).filter((id) => allowed.has(BY_ID[id].cat));
    if (rule.blockCats) pool = pool.filter((id) => !rule.blockCats.includes(BY_ID[id].cat));
    if (rule.blockIds) pool = pool.filter((id) => !rule.blockIds.includes(id));
    if (opts.noMeat) pool = pool.filter((id) => BY_ID[id].cat !== "meat");
    if (opts.noFish) pool = pool.filter((id) => BY_ID[id].cat !== "fish");
    if (opts.budget === "eco") {
      const p = pool.filter((id) => BY_ID[id].price === 1);
      if (p.length >= 8) pool = p;
      else {
        const p2 = pool.filter((id) => BY_ID[id].price <= 2);
        if (p2.length >= 8) pool = p2;
      }
    }
    if (opts.budget === "premium") {
      const p = pool.filter((id) => BY_ID[id].price === 3);
      if (p.length >= 6) pool = p;
      else {
        const p2 = pool.filter((id) => BY_ID[id].price >= 2);
        if (p2.length >= 6) pool = p2;
      }
    }
    return pool;
  }

  function satisfies(combo, rule) {
    if (!rule.must) return true;
    const ids = new Set(combo);
    const cats = new Set(combo.map((id) => BY_ID[id].cat));
    return rule.must.every((group) => group.some((x) => ids.has(x) || cats.has(x)));
  }

  function pickForPurpose(purposeId, opts = {}) {
    const rule = FA.PURPOSE_RULES[purposeId];
    if (!rule) return null;
    const count = opts.count || 3;
    const bold = opts.bold || 0;                 // 0 проверенное, 1 интересное, 2 смелое
    const minW = bold === 0 ? 3 : bold === 1 ? 2 : 1;
    const pool = purposePool(purposeId, opts);
    const inPool = new Set(pool);
    let seeds = rule.seeds.filter((id) => inPool.has(id));
    if (!seeds.length) seeds = pool;

    for (let attempt = 0; attempt < 500; attempt++) {
      const combo = [sample(seeds)];
      let guard = 0;
      while (combo.length < count && guard++ < 60) {
        const usedCats = new Set(combo.map((id) => BY_ID[id].cat));
        const cands = pool.filter((id) => !combo.includes(id) && combo.every((c) => {
          const e = edge(c, id);
          return e && e.w >= minW;
        })).filter((id) => {
          const cat = BY_ID[id].cat;
          const same = combo.filter((c) => BY_ID[c].cat === cat).length;
          if (["grain", "legume", "meat", "fish"].includes(cat)) return same === 0;
          return same < 2;
        });
        if (!cands.length) break;

        const scored = cands.map((id) => {
          let s = 1;
          combo.forEach((c) => {
            const e = edge(c, id);
            if (bold === 2) s += (4 - e.w) * 2;            // смелое — тянем к весу 1
            else if (bold === 1) s += e.w === 2 ? 6 : 2;    // интересное — к весу 2
            else s += e.w * 3;                              // проверенное — к весу 3
          });
          if (!usedCats.has(BY_ID[id].cat)) s += 3;         // разные категории
          return { id, s };
        });
        const total = scored.reduce((a, b) => a + b.s, 0);
        let r = Math.random() * total;
        let pick = scored[scored.length - 1].id;
        for (const it of scored) { r -= it.s; if (r <= 0) { pick = it.id; break; } }
        combo.push(pick);
      }

      if (combo.length !== count) continue;
      const cats = new Set(combo.map((id) => BY_ID[id].cat));
      if (cats.size < 2) continue;
      if (!satisfies(combo, rule)) continue;
      const pairs = [];
      for (let i = 0; i < combo.length; i++)
        for (let j = i + 1; j < combo.length; j++) {
          const e = edge(combo[i], combo[j]);
          if (e) pairs.push(e.w);
        }
      if (bold === 1 && !pairs.some((w) => w === 2)) continue;
      if (bold === 2 && !pairs.some((w) => w === 1)) continue;
      return combo;
    }

    // запасной вариант: цепочка от сида
    const combo = [sample(seeds)];
    while (combo.length < count) {
      const next = (ADJ[combo[combo.length - 1]] || []).filter((x) => inPool.has(x.id) && !combo.includes(x.id));
      if (!next.length) break;
      combo.push(sample(next).id);
    }
    return combo;
  }

  /* ---------- описание ---------- */

  const CAT_ROLE = {
    veg: "свежесть", fruit: "сладость", herb: "зелёный аромат", spice: "пряность",
    dairy: "сливочность", meat: "плотность", fish: "морской вкус", grain: "тёплую основу",
    nut: "хруст", sweet: "десертную ноту", sauce: "кислоту", drink: "аромат"
  };

  // роль продукта в сочетании: вкусовой профиль важнее категории
  const AXIS = [
    [5, "жгучесть"], [1, "кислоту"], [4, "умами"], [2, "горчинку"],
    [0, "сладость"], [3, "соль"], [6, "аромат"]
  ];

  function roleOf(id) {
    const t = BY_ID[id].tastes;
    const notes = AXIS.filter(([i]) => t[i] >= 2).slice(0, 2).map(([, w]) => w);
    if (notes.length) return notes.join(" и ");
    return CAT_ROLE[BY_ID[id].cat] || "характер";
  }

  function whyPairs(combo) {
    const out = [];
    for (let i = 0; i < combo.length; i++)
      for (let j = i + 1; j < combo.length; j++) {
        const e = edge(combo[i], combo[j]);
        if (e) out.push({ a: combo[i], b: combo[j], w: e.w, code: e.code });
      }
    return out.sort((x, y) => y.w - x.w);
  }

  function story(combo, purposeId) {
    const pairs = whyPairs(combo);
    const rule = purposeId && FA.PURPOSE_RULES ? FA.PURPOSE_RULES[purposeId] : null;
    const pick2 = rule && rule.hint2 && (combo.join("").length + combo.length) % 2 === 0;
    const hint = rule ? (pick2 ? rule.hint2 : rule.hint) : "";
    if (!pairs.length) return hint || "Продукты связаны общими нотами.";

    // объяснение лучше брать у пары, для которой оно написано
    const explained = pairs.find((p) => FA.WHY[[p.a, p.b].sort().join("|")]);
    const top = explained || pairs[0];
    const detail = FA.WHY[[top.a, top.b].sort().join("|")];
    const reason = FA.REASONS[top.code] ? FA.REASONS[top.code].label : "";
    const head = detail
      ? `${cap(low(name(top.a)))} и ${low(name(top.b))} — ${reason}: ${detail}.`
      : `${cap(low(name(top.a)))} и ${low(name(top.b))} — ${reason || "проверенная пара"}.`;

    const known = FA.TRIOS.find((t) => [...t.ids].sort().join("|") === [...combo].sort().join("|"));
    if (known) return `${head} ${known.note}`;

    const rest = combo.filter((id) => id !== top.a && id !== top.b);
    const used = new Set([roleOf(top.a), roleOf(top.b)]);
    const extra = rest.map((id) => {
      let role = roleOf(id);
      if (used.has(role)) role = CAT_ROLE[BY_ID[id].cat] || "характер";
      if (used.has(role)) role = "свой акцент";
      used.add(role);
      return `${cap(low(name(id)))} добавляет ${role}.`;
    }).join(" ");
    const tail = hint || "";
    return `${head}${extra ? " " + extra : ""}${tail ? " " + tail : ""}`;
  }

  /* ---------- рендер ---------- */

  function budgetWord(combo) {
    const prices = combo.map((id) => BY_ID[id].price);
    if (prices.every((p) => p === 1)) return "экономно";
    if (prices.some((p) => p === 3)) return "премиум";
    return "средний бюджет";
  }

  function renderCombo(combo, opts = {}) {
    const collage = $("#collage");
    if (!collage) return;
    const purpose = opts.purpose ? FA.PURPOSE_BY_ID[opts.purpose] : null;

    collage.dataset.n = String(combo.length);
    collage.style.setProperty("--n", String(combo.length));
    collage.innerHTML = combo.map((id) => `
      <div class="shot">
        <div class="shot__pic">${img(id)}</div>
        <span class="shot__name">${esc(name(id))}</span>
      </div>`).join("");

    const gen = opts.purpose && FA.PURPOSE_GEN ? FA.PURPOSE_GEN[opts.purpose] : "";
    $("#resultKicker").innerHTML = `<i></i>${gen ? "Сочетание для " + esc(gen) : "Неожиданное сочетание"}`;
    $("#comboTitle").textContent = combo.map(name).join(" · ");
    $("#comboDesc").textContent = story(combo, opts.purpose);

    const pills = [];
    if (purpose) pills.push(purpose.short);
    pills.push(combo.length + " продукта");
    pills.push(budgetWord(combo));
    $("#comboMeta").innerHTML = pills.map((p) => `<span>${esc(p)}</span>`).join("");

    [collage, $("#comboTitle"), $("#comboDesc"), $("#comboMeta")].forEach((el) => {
      if (!el) return;
      el.classList.remove("fade-up");
      void el.offsetWidth;
      el.classList.add("fade-up");
    });

    fallbackImages(collage);

    try {
      const url = new URL(location.href);
      url.searchParams.set("c", combo.join(","));
      if (opts.purpose) url.searchParams.set("p", opts.purpose);
      else url.searchParams.delete("p");
      history.replaceState(null, "", url);
    } catch { /* file:// */ }

    if (opts.scroll) $("#result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- домашний экран ---------- */

  function initHome() {
    const stats = $("#stats");
    if (stats) {
      const n = FA.ING.length;
      const tail = n % 10 === 1 && n % 100 !== 11 ? "продукт" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "продукта" : "продуктов";
      stats.textContent = `${n} ${tail} · ${EDGES.size.toLocaleString("ru-RU").replace(/\u00A0/g, " ")} проверенных пар`;
    }

    const note = $("#purposesNote");
    if (note && FA.PURPOSES) {
      const n = FA.PURPOSES.length;
      const word = [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "повода" : "поводов";
      note.textContent = `От джема до маринада — ${n} ${word}`;
    }

    const state = { purpose: "jam", count: 3, budget: "any", bold: 1, noMeat: false, noFish: false };

    /* карточки целей */
    const purposes = $("#purposes");
    if (purposes && FA.PURPOSES) {
      purposes.innerHTML = FA.PURPOSES.map((p) => `
        <button class="purpose" data-purpose="${p.id}" aria-pressed="false">
          ${img(p.photo)}
          <span class="purpose__dot"></span>
          <span class="purpose__text"><b>${esc(p.name)}</b><span>${esc(p.lead)}</span></span>
        </button>`).join("");
      fallbackImages(purposes);

      purposes.addEventListener("click", (e) => {
        const b = e.target.closest("[data-purpose]");
        if (!b) return;
        state.purpose = b.dataset.purpose;
        syncPurpose();
        run(true);
      });
    }

    /* чипы цели в настройках */
    const setPurposes = $("#setPurposes");
    if (setPurposes && FA.PURPOSES) {
      setPurposes.innerHTML = FA.PURPOSES.map((p) =>
        `<button class="pill" data-set-purpose="${p.id}" aria-pressed="${p.id === state.purpose}">${esc(p.short)}</button>`).join("");
      setPurposes.addEventListener("click", (e) => {
        const b = e.target.closest("[data-set-purpose]");
        if (!b) return;
        state.purpose = b.dataset.setPurpose;
        syncPurpose();
      });
    }

    function syncPurpose() {
      $$("[data-purpose]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.purpose === state.purpose)));
      $$("[data-set-purpose]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.setPurpose === state.purpose)));
    }

    function run(scroll) {
      const combo = pickForPurpose(state.purpose, state);
      if (combo) renderCombo(combo, { purpose: state.purpose, scroll });
    }

    $("#btnSurprise") && $("#btnSurprise").addEventListener("click", () => {
      const list = FA.PURPOSES || [];
      state.purpose = sample(list).id;
      state.bold = 2;
      syncPurpose();
      $$("[data-bold]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.bold === "2")));
      run(true);
    });

    $("#btnSettings") && $("#btnSettings").addEventListener("click", () => {
      $("#viewSettings").hidden = false;
      $("#viewSettings").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $("#btnBack") && $("#btnBack").addEventListener("click", () => { $("#viewSettings").hidden = true; });

    $$("[data-count]").forEach((b) => b.addEventListener("click", () => {
      state.count = +b.dataset.count;
      $$("[data-count]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    }));
    $$("[data-budget]").forEach((b) => b.addEventListener("click", () => {
      state.budget = b.dataset.budget;
      $$("[data-budget]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    }));
    $$("[data-bold]").forEach((b) => b.addEventListener("click", () => {
      state.bold = +b.dataset.bold;
      $$("[data-bold]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    }));
    $$("[data-exclude]").forEach((b) => b.addEventListener("click", () => {
      const on = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", String(on));
      state[b.dataset.exclude] = on;
    }));

    $("#btnApply") && $("#btnApply").addEventListener("click", () => run(true));
    $("#btnAgain") && $("#btnAgain").addEventListener("click", () => run(true));

    $("#btnCopy") && $("#btnCopy").addEventListener("click", async (e) => {
      try {
        await navigator.clipboard.writeText(location.href);
        const b = e.currentTarget;
        const old = b.textContent;
        b.textContent = "Ссылка скопирована";
        setTimeout(() => { b.textContent = old; }, 1600);
      } catch { /* игнорируем */ }
    });

    document.addEventListener("keydown", (e) => {
      if (e.target.matches("input, textarea")) return;
      if (e.key === "r" || e.key === "R" || e.key === "к" || e.key === "К") run(true);
    });

    /* состояние из ссылки */
    const params = new URLSearchParams(location.search);
    if (params.get("p") && FA.PURPOSE_BY_ID && FA.PURPOSE_BY_ID[params.get("p")]) {
      state.purpose = params.get("p");
      syncPurpose();
    }
    const c = params.get("c");
    if (c) {
      const ids = c.split(",").filter((id) => BY_ID[id]);
      if (ids.length >= 2) { renderCombo(ids, { purpose: state.purpose }); return; }
    }
    run(false);
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
          <p class="meta-line">${esc(catOf(id).name)} · ${esc(it.season)}</p>
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

  /* ---------- лицензии ---------- */

  async function initCredits() {
    $$("[data-stat]").forEach((el) => {
      if (el.dataset.stat === "ing") el.textContent = FA.ING.length;
      if (el.dataset.stat === "pairs") el.textContent = EDGES.size.toLocaleString("ru-RU").replace(/\u00A0/g, " ");
    });
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


  /* ---------- изюминка: что добавить в готовое ---------- */

  const ACC_CATS = {
    jam: ["spice", "herb", "drink", "nut", "fruit", "sweet"],
    bake: ["spice", "nut", "fruit", "sweet", "drink"],
    pasta: ["spice", "herb", "dairy", "sauce", "nut"],
    salad: ["herb", "spice", "nut", "dairy", "sauce", "fruit"],
    grill: ["spice", "herb", "sauce", "fruit"],
    soup: ["herb", "spice", "dairy", "sauce", "nut"],
    dessert: ["spice", "nut", "fruit", "sweet", "drink"],
    drink: ["herb", "spice", "fruit", "sweet"],
    breakfast: ["spice", "fruit", "nut", "sweet", "dairy"],
    side: ["herb", "spice", "dairy", "nut", "sauce"],
    snack: ["spice", "fruit", "dairy", "nut", "sauce"],
    marinade: ["spice", "herb", "sauce", "fruit", "drink"]
  };

  const ACC_UNIT = {
    spice: "щепотка", herb: "веточка", drink: "1 ст. л.", sauce: "1 ч. л.",
    nut: "горсть", fruit: "цедра или пара долек", sweet: "1 ч. л.", dairy: "1 ст. л."
  };

  const ACC_SCALE = {
    jam: "на банку 0,5 л", bake: "на противень", pasta: "на порцию", salad: "на салат",
    grill: "на килограмм", soup: "на кастрюлю", dessert: "на порцию", drink: "на стакан",
    breakfast: "на порцию", side: "на гарнир", snack: "на доску", marinade: "на килограмм продукта"
  };

  const EFFECTS = [
    { id: "fresh", name: "Свежесть" },
    { id: "warm", name: "Тепло" },
    { id: "contrast", name: "Контраст" },
    { id: "depth", name: "Глубина" },
    { id: "bright", name: "Яркость" },
    { id: "noble", name: "Благородство" }
  ];

  const EFFECT_TEXT = {
    fresh: "свежий край и меньше приторности",
    warm: "тёплая пряность и глубина",
    contrast: "баланс: соль и жар против сладости",
    depth: "второй этаж — умами и карамель",
    bright: "отчётливая кислота и ясный вкус",
    noble: "нота, за которую не жалко платить"
  };

  const CITRUS_IDS = new Set(["orange", "lemon", "lime", "grapefruit", "pomelo", "tangerine",
    "kumquat", "bergamot", "yuzu"]);
  const WARM_IDS = new Set(["cinnamon", "clove", "nutmeg", "cardamom", "star_anise", "allspice",
    "mace", "ginger", "turmeric", "fenugreek", "grains_of_paradise", "baharat", "garam_masala",
    "curry_powder", "cumin", "coriander_seed", "caraway", "fennel_seed", "celery_seed", "juniper",
    "saffron"]);
  const DEPTH_IDS = new Set(["miso", "soy_sauce", "fish_sauce", "oyster_sauce", "worcestershire",
    "tomato_paste", "caramel", "coffee", "dark_chocolate", "cocoa", "smoked_paprika", "chipotle",
    "ancho", "porcini", "truffle", "mushroom", "nori", "kelp"]);
  const NOBLE_IDS = new Set(["vanilla", "saffron", "truffle", "brandy", "rum", "whiskey", "gin",
    "vodka", "tequila", "champagne", "red_wine", "white_wine", "sake", "vermouth", "cider", "caviar"]);

  const SAVORY_ACCENTS = new Set(["miso", "soy_sauce", "fish_sauce", "oyster_sauce",
    "worcestershire", "tomato_paste", "ketchup", "bbq_sauce", "mayonnaise", "aioli", "pesto",
    "sriracha", "tabasco", "hoisin", "chipotle", "ancho", "smoked_paprika", "nori", "kelp",
    "mushroom", "porcini", "truffle"]);
  const SWEET_PURPOSES = new Set(["jam", "dessert", "bake", "drink"]);

  const ACC_DEFAULT_BASE = {
    jam: "orange", bake: "apple", pasta: "tomato", salad: "tomato", grill: "chicken",
    soup: "mushroom", dessert: "strawberry", drink: "lemon", breakfast: "egg",
    side: "potato", snack: "parmesan", marinade: "chicken"
  };

  function effectTags(id) {
    const t = BY_ID[id].tastes;
    const cat = BY_ID[id].cat;
    const tags = new Set();
    if (cat === "herb" || CITRUS_IDS.has(id) || id === "mint") tags.add("fresh");
    if (WARM_IDS.has(id)) tags.add("warm");
    if (t[5] >= 2 || t[3] >= 2) tags.add("contrast");
    if (t[1] >= 2) tags.add("bright");
    if (t[4] >= 2 || DEPTH_IDS.has(id)) tags.add("depth");
    if (NOBLE_IDS.has(id)) tags.add("noble");
    if (!tags.size) {
      if (cat === "dairy" || cat === "nut") tags.add("depth");
      else if (cat === "spice" || cat === "sweet") tags.add("warm");
      else if (cat === "sauce") tags.add("bright");
      else tags.add("fresh");
    }
    return tags;
  }

  function accentCandidates(baseId, purposeId, opts) {
    const cats = ACC_CATS[purposeId] || ["spice", "herb", "sauce"];
    const out = [];
    FA.ING.forEach((r) => {
      const id = r[0];
      if (id === baseId) return;
      const it = BY_ID[id];
      if (!cats.includes(it.cat)) return;
      const e = edge(baseId, id);
      if (!e) return;
      // из напитков акцентом бывают только вино и крепкое, не квас и не чай
      if (it.cat === "drink" && !NOBLE_IDS.has(id)) return;
      // в сладкое не кладём умами-соусы и копчёности
      if (SWEET_PURPOSES.has(purposeId) && SAVORY_ACCENTS.has(id)) return;
      if (opts.budget === "eco" && it.price === 3) return;
      const tags = effectTags(id);
      if (opts.effect && !tags.has(opts.effect)) return;
      const CAT_BONUS = { spice: 3, herb: 3, sauce: 2, nut: 2, fruit: 2, dairy: 1, sweet: 1 };
      let score = e.w * 3 + Math.random() * 2.4 + (CAT_BONUS[it.cat] || 0);
      if (it.price === 1) score += 2;
      if (opts.budget === "premium" && it.price === 3) score += 3;
      if (opts.effect) score += 4;
      out.push({ id, score, tags, edge: e });
    });
    return out.sort((a, b) => b.score - a.score);
  }

  function renderAccents(baseId, purposeId, opts) {
    const box = $("#accents");
    if (!box) return;
    let list = accentCandidates(baseId, purposeId, opts);
    let fellBack = false;
    if (!list.length && opts.effect) {
      list = accentCandidates(baseId, purposeId, { ...opts, effect: "" });
      fellBack = list.length > 0;
    }
    const chosen = [];
    const cats = new Set();
    for (const c of list) {
      const cat = BY_ID[c.id].cat;
      if (cats.has(cat)) continue;
      cats.add(cat);
      chosen.push(c);
      if (chosen.length === 3) break;
    }
    if (!chosen.length) {
      box.innerHTML = `<p class="empty">Для этой основы пока нет подходящих акцентов — попробуйте другой продукт или уберите фильтр эффекта.</p>`;
      return;
    }
    const note = fellBack
      ? `<p class="accent-note">Под выбранный эффект ничего не нашлось — показываю ближайшие акценты.</p>`
      : "";
    box.innerHTML = note + chosen.map((c) => {
      const it = BY_ID[c.id];
      const tag = [...c.tags][0];
      const label = EFFECTS.find((x) => x.id === tag);
      const detail = FA.WHY[[baseId, c.id].sort().join("|")];
      const reason = FA.REASONS[c.edge.code];
      const why = detail
        ? cap(detail)
        : reason ? cap(reason.text) : "Проверенная пара";
      const effect = EFFECT_TEXT[tag] || "";
      return `<article class="accent-card">
        <div class="accent-card__pic">${img(c.id)}</div>
        <div class="accent-card__body">
          <span class="tag">${esc(label ? label.name : "")}</span>
          <h3>${esc(it.name)}</h3>
          <p class="why">${esc(why)}. ${esc(cap(effect))}.</p>
          <p class="dose"><b>Сколько:</b> ${esc(ACC_UNIT[it.cat] || "немного")} ${esc(ACC_SCALE[purposeId] || "")}.</p>
        </div>
      </article>`;
    }).join("");
    fallbackImages(box);
  }

  function initAccent() {
    const box = $("#accents");
    if (!box || !FA.PURPOSES) return;

    const state = { purpose: "jam", effect: "", budget: "any" };
    const purposesBox = $("#accPurposes");
    const effectsBox = $("#accEffects");
    const input = $("#accBase");
    const list = $("#accList");

    purposesBox.innerHTML = FA.PURPOSES.map((p) =>
      `<button class="pill" data-acc-purpose="${p.id}" aria-pressed="${p.id === state.purpose}">${esc(p.short)}</button>`).join("");
    effectsBox.innerHTML = `<button class="pill" data-acc-effect="" aria-pressed="true">Любой</button>` +
      EFFECTS.map((e) => `<button class="pill" data-acc-effect="${e.id}" aria-pressed="false">${esc(e.name)}</button>`).join("");

    function basePool() {
      const rule = FA.PURPOSE_RULES[state.purpose];
      const cats = new Set(rule.cats);
      return FA.ING.map((r) => r[0]).filter((id) => cats.has(BY_ID[id].cat))
        .sort((a, b) => name(a).localeCompare(name(b), "ru"));
    }

    function fillList() {
      list.innerHTML = basePool().map((id) => `<option value="${esc(name(id))}"></option>`).join("");
    }

    function setBase(id) {
      input.value = name(id);
      renderAccents(id, state.purpose, state);
    }

    function resolveBase() {
      const q = (input.value || "").trim().toLowerCase();
      if (!q) return null;
      const pool = basePool();
      const exact = pool.find((id) => name(id).toLowerCase() === q || id === q);
      if (exact) return exact;
      const starts = pool.find((id) => name(id).toLowerCase().startsWith(q));
      if (starts) return starts;
      const any = FA.ING.map((r) => r[0]).find((id) => name(id).toLowerCase() === q);
      return any || null;
    }

    purposesBox.addEventListener("click", (e) => {
      const b = e.target.closest("[data-acc-purpose]");
      if (!b) return;
      state.purpose = b.dataset.accPurpose;
      $$("[data-acc-purpose]", purposesBox).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      fillList();
      const def = ACC_DEFAULT_BASE[state.purpose];
      setBase(def && BY_ID[def] ? def : basePool()[0]);
    });

    effectsBox.addEventListener("click", (e) => {
      const b = e.target.closest("[data-acc-effect]");
      if (!b) return;
      state.effect = b.dataset.accEffect;
      $$("[data-acc-effect]", effectsBox).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    });

    $$("[data-acc-budget]").forEach((b) => b.addEventListener("click", () => {
      state.budget = b.dataset.accBudget;
      $$("[data-acc-budget]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    }));

    $("#btnAccent").addEventListener("click", () => {
      const id = resolveBase();
      if (!id) {
        box.innerHTML = `<p class="empty">Не нашёл такой продукт. Начните вводить название — подсказки появятся в списке.</p>`;
        return;
      }
      input.value = name(id);
      renderAccents(id, state.purpose, state);
      box.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });

    fillList();
    setBase(ACC_DEFAULT_BASE[state.purpose] || basePool()[0]);
  }

  /* ---------- запуск ---------- */

  document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page;
    if (page === "home") { initHome(); initAccent(); }
    if (page === "atlas") initAtlas();
    if (page === "combos") initCombos();
    if (page === "method") initCredits();
  });
})();
