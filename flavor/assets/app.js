/* ============================================================
   Вкусовой атлас — вся логика
   Данные: assets/data/*.js (FA = ингредиенты, пары, трио, мета)
   ============================================================ */

(function () {
  "use strict";

  const FA = window.FA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

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
  const catOf = (id) => FA.CATS[BY_ID[id].cat] || { name: "", color: "#b9a58c" };

  /* ---------- картинки ---------- */

  const img = (id) => `<img src="assets/img/ing/${id}.jpg" alt="${esc(name(id))}" loading="lazy" decoding="async">`;

  function fallbackImages(root) {
    $$("img", root).forEach((el) => {
      el.addEventListener("error", () => {
        const box = el.closest(".tile, .card__pic, .mini__pic, .ing__pic, .plate__item, .trio__pics");
        if (!box) return;
        const src = el.getAttribute("src") || "";
        const id = src.split("/").pop().replace(".jpg", "");
        el.remove();
        box.classList.add("tile--empty");
        box.insertAdjacentHTML("afterbegin",
          `<span class="tile__letter">${esc((BY_ID[id] ? BY_ID[id].name : id).charAt(0))}</span>`);
      });
    });
  }

  /* ---------- выборка сочетаний ---------- */

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
      if (combo.length === count) {
        if (mode === "bold" && !combo.some((id, i) => combo.slice(i + 1).some((j) => (edge(id, j) || { w: 0 }).w <= 1))) continue;
        return combo;
      }
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
    if (cats.includes("fish")) return "Быстрый жар или запекание, кислоту и зелень добавляем в конце — так аромат останется.";
    if (cats.includes("meat")) return "Сильный жар до корочки, отдых под фольгой, кислота — в соус.";
    if (cats.filter((c) => c === "fruit").length >= 2) return "Салат или десерт: соль и кислота держат сладость, сливки её смягчают.";
    if (cats.includes("grain")) return "Тёплая основа: специи обжарить в масле, собрать всё вместе и дать постоять.";
    return "Собрать в одной сковороде или в салате: сначала плотные текстуры, травы и кислота — в конце.";
  }

  function story(combo) {
    const pairs = whyPairs(combo);
    const top = pairs[0];
    if (!top) return "Продукты связаны через общие ноты — проверенная база сочетаний.";
    const key = [top.a, top.b].sort().join("|");
    const detail = FA.WHY[key];
    const reason = FA.REASONS[top.code] ? FA.REASONS[top.code].label : "";
    const first = detail
      ? `${cap(name(top.a))} и ${name(top.b)} — ${reason}: ${detail}.`
      : `${cap(name(top.a))} и ${name(top.b)}: ${FA.REASONS[top.code] ? FA.REASONS[top.code].text : "проверенная пара"}.`;
    return `<b>Почему работает.</b> ${esc(first)}<br><b>Как собрать.</b> ${esc(comboUse(combo))}`;
  }

  function budgetWord(combo) {
    const prices = combo.map((id) => BY_ID[id].price);
    if (prices.every((p) => p === 1)) return "экономно";
    if (prices.some((p) => p === 3)) return "премиум";
    return "средний бюджет";
  }

  /* ---------- карточка сочетания ---------- */

  function renderCombo(combo, opts = {}) {
    const media = $("#comboMedia");
    const title = $("#comboTitle");
    const storyEl = $("#comboStory");
    const chips = $("#comboChips");
    if (!media || !title) return;

    media.dataset.count = combo.length;
    media.innerHTML = combo.map((id) => `
      <div class="tile">
        ${img(id)}
        <span class="tile__cat" style="background:${catOf(id).color}"></span>
        <span class="tile__name">${esc(name(id))}</span>
      </div>`).join("");

    title.textContent = combo.map(name).join(" · ");
    storyEl.innerHTML = story(combo);

    const labels = [...new Set(whyPairs(combo).map((p) => (FA.REASONS[p.code] ? FA.REASONS[p.code].label : "")))].filter(Boolean).slice(0, 2);
    chips.innerHTML = [...labels, budgetWord(combo)].map((t) => `<li>${esc(t)}</li>`).join("");

    fallbackImages(media);
    if (opts.scroll && $("#result")) $("#result").scrollIntoView({ behavior: "smooth", block: "center" });
    try {
      const url = new URL(location.href);
      url.searchParams.set("c", combo.join(","));
      history.replaceState(null, "", url);
    } catch { /* file:// — не страшно */ }
  }

  /* ---------- герой ---------- */

  const PLATE = ["tomato", "basil", "mozzarella", "olive_oil", "garlic"];

  const RAIL = ["tomato", "garlic", "parmesan", "honey", "dark_chocolate", "coffee", "butter", "beef", "shrimp", "bread"];

  function initHero() {
    const plate = $("#heroPlate");
    if (!plate) return;
    plate.innerHTML = PLATE.map((id, i) =>
      `<div class="plate__item plate__item--${i + 1}">${img(id)}</div>`).join("") +
      `<span class="plate__cap">сочетается</span>`;
    fallbackImages(plate);

    const random = $("#btnRandom");
    if (random) random.addEventListener("click", () => {
      renderCombo(pickCombo({ count: 3, mode: "balance", budget: "any" }), { scroll: true });
    });
  }

  /* ---------- настройки ---------- */

  function initSettings() {
    const dlg = $("#dlgSettings");
    if (!dlg) return;
    const state = { count: 3, budget: "any", mode: "balance", noMeat: false, noFish: false };

    $$("[data-count]", dlg).forEach((b) => b.addEventListener("click", () => {
      state.count = +b.dataset.count;
      $$("[data-count]", dlg).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    }));
    $$("[data-budget]", dlg).forEach((b) => b.addEventListener("click", () => {
      state.budget = b.dataset.budget;
      $$("[data-budget]", dlg).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    }));

    const btn = $("#btnSettings");
    if (btn) btn.addEventListener("click", () => dlg.showModal());

    $("#btnApply", dlg).addEventListener("click", () => {
      const meat = $("#optMeat", dlg);
      const fish = $("#optFish", dlg);
      state.noMeat = !!(meat && meat.checked);
      state.noFish = !!(fish && fish.checked);
      dlg.close();
      renderCombo(pickCombo(state), { scroll: true });
    });

    $(".close-x", dlg).addEventListener("click", () => dlg.close());
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  }

  /* ---------- главная: тизеры ---------- */

  function initHome() {
    const rail = $("#homeRail");
    if (rail) {
      const ids = RAIL;
      rail.innerHTML = ids.map((id) => `
        <a class="mini" href="atlas.html?id=${id}">
          <div class="mini__pic">${img(id)}</div>
          <b>${esc(name(id))}</b>
          <span>${esc(catOf(id).short || catOf(id).name)}</span>
        </a>`).join("");
      fallbackImages(rail);
    }

    const trios = $("#homeTrios");
    if (trios) {
      trios.innerHTML = FA.TRIOS.slice(0, 3).map(trioCard).join("");
      fallbackImages(trios);
    }

    initHero();
    initSettings();
    initCopy();

    const btnAgain = $("#btnAgain");
    if (btnAgain) btnAgain.addEventListener("click", () => renderCombo(pickCombo({ count: 3 }), { scroll: true }));

    const params = new URLSearchParams(location.search);
    const c = params.get("c");
    if (c) {
      const ids = c.split(",").filter((id) => BY_ID[id]);
      if (ids.length >= 2) { renderCombo(ids, { scroll: true }); return; }
    }
    const withId = params.get("with");
    if (withId && BY_ID[withId]) { renderCombo(pickCombo({ count: 3, must: withId }), { scroll: true }); return; }
    renderCombo(["tomato", "basil", "mozzarella"]);
  }

  function initCopy() {
    const btn = $("#btnCopy");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        btn.textContent = "Ссылка скопирована";
        setTimeout(() => { btn.textContent = "Скопировать ссылку"; }, 1800);
      } catch {
        btn.textContent = "Скопируйте адрес из строки браузера";
      }
    });
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
      `<button data-cat="${k}" aria-pressed="${k === "all"}">${esc(label)}</button>`).join("");

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
        return `<button class="card" data-id="${it.id}">
          <div class="card__pic">${img(it.id)}</div>
          <div class="card__body"><b>${esc(it.name)}</b><span>${esc(catOf(it.id).name)}</span></div>
        </button>`;
      }).join("") || `<p class="empty-state">Ничего не нашлось — попробуйте другое слово.</p>`;
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
      const card = e.target.closest(".card[data-id]");
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
    const partners = (ADJ[id] || []).slice(0, 10);

    $("#ingBody").innerHTML = `
      <div class="ing">
        <div class="ing__pic">${img(id)}</div>
        <div>
          <h2>${esc(it.name)}</h2>
          <div class="latin">${esc(it.latin)}</div>
          <p class="note">${esc(it.note)}</p>
          <div class="bars">
            ${it.tastes.map((v, i) => `
              <div class="meter-row"><span>${TASTES[i]}</span><span class="meter"><i style="width:${(v / 3) * 100}%"></i></span></div>`).join("")}
          </div>
          <p class="note" style="margin-top:14px;color:var(--muted);font-size:13.5px">
            ${esc(catOf(id).name)} · ${esc(it.season)} · ${["", "экономно", "средний бюджет", "премиум"][it.price]}
          </p>
          ${partners.length ? `<div class="partners">${partners.map((p) =>
            `<button data-partner="${p.id}">${esc(name(p.id))}</button>`).join("")}</div>` : ""}
          <div style="margin-top:20px">
            <a class="btn btn--primary btn--sm" href="index.html?with=${encodeURIComponent(id)}">Сочетать с этим продуктом</a>
          </div>
        </div>
      </div>`;
    fallbackImages(dlg);
    $("#ingBody").onclick = (e) => {
      const b = e.target.closest("button[data-partner]");
      if (b) openIngredient(b.dataset.partner);
    };
    if (!dlg.open) dlg.showModal();
    $(".close-x", dlg).onclick = () => dlg.close();
    dlg.onclick = (e) => { if (e.target === dlg) dlg.close(); };
  }

  /* ---------- трио ---------- */

  function trioCard(t) {
    return `<article class="trio">
      <div class="trio__pics">${t.ids.map((id) => img(id)).join("")}</div>
      <div class="trio__body">
        <h3>${esc(t.name)}</h3>
        <p>${esc(t.note)}</p>
        <div class="trio__meta">
          <span>${esc((Array.isArray(t.tags) ? t.tags : String(t.tags || "").split(",")).slice(0, 2).join(" · "))}</span>
          <span>${esc(t.season)}</span>
        </div>
      </div>
    </article>`;
  }

  function initCombos() {
    const grid = $("#comboGrid");
    if (!grid) return;
    const chips = $("#comboCats");
    const cats = [["all", "Все"], ...Object.entries(FA.CATS).map(([k, v]) => [k, v.short || v.name])];
    chips.innerHTML = cats.map(([k, label]) =>
      `<button data-cat="${k}" aria-pressed="${k === "all"}">${esc(label)}</button>`).join("");

    const draw = (cat) => {
      const list = FA.TRIOS.filter((t) => cat === "all" || t.ids.some((id) => BY_ID[id] && BY_ID[id].cat === cat));
      grid.innerHTML = list.map(trioCard).join("") || `<p class="empty-state">В этой категории пока нет готовых трио.</p>`;
      fallbackImages(grid);
    };

    chips.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-cat]");
      if (!b) return;
      $$("button[data-cat]", chips).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      draw(b.dataset.cat);
    });
    draw("all");
  }

  /* ---------- «о данных»: фотографии ---------- */

  async function initCredits() {
    const box = $("#credits");
    if (!box) return;
    try {
      const res = await fetch("assets/img/manifest.json");
      const data = await res.json();
      const rows = Object.entries(data).sort((a, b) => a[0].localeCompare(b[0]));
      box.innerHTML = rows.map(([id, m]) => {
        const title = m.label || m.file || id;
        const link = m.page ? `<a href="${esc(m.page)}" target="_blank" rel="noopener">${esc(title)}</a>` : esc(title);
        return `<li><b>${esc(name(id))}</b> — ${link}, ${esc(m.license || "")}${m.author ? ", " + esc(m.author) : ""}</li>`;
      }).join("");
    } catch {
      box.innerHTML = `<li>Список не загрузился — обновите страницу.</li>`;
    }
  }

  /* ---------- запуск ---------- */

  document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page;
    $$(".nav a").forEach((a) => {
      if (a.dataset.nav === page) a.setAttribute("aria-current", "page");
    });
    if (page === "home") initHome();
    if (page === "atlas") initAtlas();
    if (page === "combos") initCombos();
    if (page === "method") initCredits();
    initCopy();
  });
})();
