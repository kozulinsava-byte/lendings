/* ============================================================
   ВКУСОВОЙ АТЛАС — логика
   ============================================================ */
(function () {
  const FA = window.FA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const nf = (n) => n.toLocaleString("ru-RU").replace(/\u00A0/g, " ");

  /* ---------- индексы ---------- */
  const BY_ID = {};
  FA.ING.forEach((r) => {
    BY_ID[r[0]] = { id: r[0], name: r[1], lat: r[2], cat: r[3], taste: r[4], price: r[5], season: r[6], tags: r[7].split(","), note: r[8] };
  });
  const EDGES = new Map();
  const ADJ = {};
  FA.ING.forEach((r) => (ADJ[r[0]] = []));
  for (const [a, str] of Object.entries(FA.PAIRS)) {
    for (const tok of str.trim().split(/\s+/)) {
      const [b, w, code] = tok.split(":");
      const key = a < b ? a + "|" + b : b + "|" + a;
      const prev = EDGES.get(key);
      if (!prev || +w > prev.w) EDGES.set(key, { a, b, w: +w, code, key });
    }
  }
  for (const e of EDGES.values()) {
    ADJ[e.a].push({ id: e.b, w: e.w, code: e.code });
    ADJ[e.b].push({ id: e.a, w: e.w, code: e.code });
  }
  for (const k in ADJ) ADJ[k].sort((x, y) => y.w - x.w || BY_ID[x.id].name.localeCompare(BY_ID[y.id].name, "ru"));

  // цена трио = самый дорогой компонент — так же, как у сгенерированных сочетаний
  FA.TRIOS.forEach((t) => { t.price = Math.max(...t.ids.map((id) => BY_ID[id].price)); });

  const edge = (a, b) => EDGES.get(a < b ? a + "|" + b : b + "|" + a) || null;
  const name = (id) => (BY_ID[id] ? BY_ID[id].name : id);
  const cat = (id) => FA.CATS[BY_ID[id].cat];
  const priceWord = ["", "эконом", "средний", "премиум"];
  const CATNO = {};
  FA.ING.map((r) => BY_ID[r[0]])
    .sort((a, b) => a.name.localeCompare(b.name, "ru"))
    .forEach((x, i) => (CATNO[x.id] = String(i + 1).padStart(3, "0")));

  /* ---------- глиф ---------- */
  function glyph(id, size = 100, cls = "") {
    const t = BY_ID[id].taste;
    const cx = 50, cy = 50, R = 37;
    const rings = [0.34, 0.67, 1].map((k) => `<circle cx="50" cy="50" r="${(R * k).toFixed(1)}" fill="none" stroke="currentColor" stroke-width=".4" opacity="${k === 1 ? 0.42 : 0.2}"/>`).join("");
    const axes = t.map((_, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 7;
      return `<line x1="50" y1="50" x2="${(cx + Math.cos(a) * R).toFixed(1)}" y2="${(cy + Math.sin(a) * R).toFixed(1)}" stroke="currentColor" stroke-width=".35" opacity=".22"/>`;
    }).join("");
    const pts = t.map((v, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 7;
      const r = 5 + (v / 3) * (R - 5);
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    });
    const poly = pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    const dots = pts.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="1.2" fill="currentColor"/>`).join("");
    return `<svg class="${cls}" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
      ${rings}${axes}
      <polygon points="${poly}" fill="currentColor" fill-opacity=".1" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>
      ${dots}
    </svg>`;
  }

  /* ---------- выборка ---------- */
  function sample(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function plural(n, one, few, many) {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  }

  function comboPool(opts) {
    let pool = FA.ING.map((r) => r[0]);
    if (opts.noMeat) pool = pool.filter((id) => BY_ID[id].cat !== "meat");
    if (opts.noFish) pool = pool.filter((id) => BY_ID[id].cat !== "fish");
    if (opts.budget === "eco") {
      const p = pool.filter((id) => BY_ID[id].price === 1);
      if (p.length >= 40) pool = p;
    }
    return pool;
  }

  function pickCombo(opts) {
    const count = opts.count || 3;
    const min = opts.mode === "classic" ? 3 : opts.mode === "bold" ? 1 : 2;
    const pool = comboPool(opts);
    const preferCheap = opts.budget === "eco";
    const preferPricey = opts.budget === "premium";

    for (let attempt = 0; attempt < 900; attempt++) {
      let startPool = pool;
      if (preferPricey) {
        const p = pool.filter((id) => BY_ID[id].price === 3);
        if (p.length) startPool = p;
      }
      let combo = [sample(startPool)];
      let guard = 0;
      while (combo.length < count && guard++ < 80) {
        const usedCats = new Set(combo.map((id) => BY_ID[id].cat));
        let cands = pool.filter((id) => {
          if (combo.includes(id)) return false;
          return combo.every((c) => {
            const e = edge(c, id);
            return e && e.w >= min;
          });
        });
        if (!cands.length) break;
        if (combo.length >= 2) {
          const diverse = cands.filter((id) => !usedCats.has(BY_ID[id].cat));
          if (diverse.length) cands = diverse;
        }
        const scored = cands.map((id) => {
          let s = 1;
          for (const c of combo) {
            const e = edge(c, id);
            s += opts.mode === "bold" ? (4 - e.w) * 2 : e.w * 2;
          }
          if (preferCheap) s += (4 - BY_ID[id].price) * 2;
          if (preferPricey) s += BY_ID[id].price * 2;
          if (opts.season && opts.season !== "любой") {
            if (BY_ID[id].season === opts.season || BY_ID[id].season === "круглый год") s += 3;
          }
          return { id, s };
        });
        const total = scored.reduce((a, b) => a + b.s, 0);
        let r = Math.random() * total;
        let pick = scored[scored.length - 1].id;
        for (const it of scored) { r -= it.s; if (r <= 0) { pick = it.id; break; } }
        combo.push(pick);
      }
      if (combo.length === count) {
        if (opts.mode === "bold" && !combo.some((id, i) => combo.slice(i + 1).some((j) => edge(id, j).w === 1))) continue;
        return combo;
      }
    }
    /* запасной вариант: цепочка без клики */
    let combo = [sample(pool)];
    while (combo.length < count) {
      const cands = ADJ[combo[combo.length - 1]].filter((x) => !combo.includes(x.id) && x.w >= 1);
      if (!cands.length) break;
      combo.push(sample(cands).id);
    }
    return combo;
  }

  function whyPairs(combo) {
    const out = [];
    for (let i = 0; i < combo.length; i++) {
      for (let j = i + 1; j < combo.length; j++) {
        const e = edge(combo[i], combo[j]);
        if (!e) continue;
        const wKey = [combo[i], combo[j]].sort().join("|");
        out.push({ a: combo[i], b: combo[j], w: e.w, code: e.code, note: FA.WHY[wKey] });
      }
    }
    return out.sort((x, y) => y.w - x.w);
  }

  function comboUse(combo) {
    const ids = [...combo].sort().join("|");
    const t = FA.TRIOS.find((x) => [...x.ids].sort().join("|") === ids);
    if (t) return t.note;
    const cats = combo.map((id) => BY_ID[id].cat);
    if (cats.includes("fish")) return "Быстрая обжарка или запекание: кислота и зелень — в конце, чтобы сохранить аромат.";
    if (cats.includes("meat")) return "Сильный жар для корочки, затем отдых под фольгой — и кислота в соусе.";
    if (cats.filter((c) => c === "fruit").length >= 2) return "Салат или десерт: соль и кислота держат сладость, сливки смягчают.";
    if (cats.includes("grain")) return "Тёплая основа: обжарить специи в масле, собрать всё вместе и дать постоять.";
    return "Собрать на одной сковороде или в салате: сначала плотные текстуры, травы и кислота — в конце.";
  }

  /* ---------- состояние ---------- */
  const store = {
    get saved() { try { return JSON.parse(localStorage.getItem("fa:saved") || "[]"); } catch (e) { return []; } },
    set saved(v) { localStorage.setItem("fa:saved", JSON.stringify(v)); }
  };
  function isSaved(combo) {
    const k = [...combo].sort().join("|");
    return store.saved.some((c) => [...c].sort().join("|") === k);
  }
  function toggleSaved(combo) {
    const all = store.saved;
    const k = [...combo].sort().join("|");
    const i = all.findIndex((c) => [...c].sort().join("|") === k);
    if (i >= 0) { all.splice(i, 1); toast("Убрано из сохранённых"); }
    else { all.push(combo); toast("Сохранено"); }
    store.saved = all;
    updateSavedCount();
    renderDrawer();
  }
  function updateSavedCount() {
    const el = $("#savedCount");
    if (el) el.textContent = store.saved.length;
  }

  /* ---------- тост ---------- */
  let toastT;
  function toast(msg) {
    const t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("is-open");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("is-open"), 2200);
  }

  /* ---------- поиск ---------- */
  function initSearch() {
    const overlay = $("#searchOverlay");
    const input = $("#searchInput");
    const results = $("#searchResults");
    if (!overlay) return;
    const open = () => {
      overlay.classList.add("is-open");
      document.body.classList.add("is-locked");
      setTimeout(() => input.focus(), 30);
      render("");
    };
    const close = () => {
      overlay.classList.remove("is-open");
      document.body.classList.remove("is-locked");
    };
    $("#searchBtn").addEventListener("click", open);
    $(".search-close").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); open(); }
    });
    function render(q) {
      const s = q.trim().toLowerCase();
      let list = FA.ING.map((r) => BY_ID[r[0]]);
      if (s) list = list.filter((x) => (x.name + " " + x.lat + " " + x.tags.join(" ")).toLowerCase().includes(s));
      list = list.slice(0, 9);
      results.innerHTML = list.length
        ? list.map((x) => `<a class="sresult" href="ingredient.html?id=${x.id}">
            <span class="nm">${esc(x.name)}</span>
            <span class="cat">${esc(FA.CATS[x.cat].name)} · ${x.tags.slice(0, 2).join(", ")}</span>
          </a>`).join("")
        : `<div class="sresult"><span class="nm">Ничего не найдено</span><span class="cat">попробуйте «мята» или «говядина»</span></div>`;
    }
    input.addEventListener("input", (e) => render(e.target.value));
  }

  /* ---------- сохранённые ---------- */
  function renderDrawer() {
    const body = $("#drawerBody");
    if (!body) return;
    const all = store.saved;
    body.innerHTML = all.length
      ? all.map((c, i) => `<div class="saved-item">
          <div><div class="nm">${c.map(name).join(" · ")}</div>
          <div class="cmp">${c.map((id) => FA.CATS[BY_ID[id].cat].short).join(" / ")}</div></div>
          <button data-del="${i}" aria-label="Удалить">×</button>
        </div>`).join("")
      : `<div class="drawer-empty">Здесь появятся сочетания, которые вы сохраните. Пока пусто — начните с генератора.</div>`;
    $$("[data-del]", body).forEach((b) => b.addEventListener("click", () => {
      const all2 = store.saved; all2.splice(+b.dataset.del, 1); store.saved = all2;
      updateSavedCount(); renderDrawer();
    }));
  }
  function initDrawer() {
    const d = $("#drawer"), scrim = $("#scrim");
    if (!d) return;
    const open = () => { d.classList.add("is-open"); scrim.classList.add("is-open"); document.body.classList.add("is-locked"); };
    const close = () => { d.classList.remove("is-open"); scrim.classList.remove("is-open"); document.body.classList.remove("is-locked"); };
    $("#savedBtn").addEventListener("click", open);
    $("#drawerClose").addEventListener("click", close);
    scrim.addEventListener("click", close);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    renderDrawer();
  }

  /* ---------- шапка, подвал, появление ---------- */
  function initCommon() {
    const bar = $("#topbar");
    const onScroll = () => { if (bar) bar.classList.toggle("is-scrolled", window.scrollY > 12); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const page = document.body.dataset.page;
    $$(".nav a").forEach((a) => { if (a.dataset.nav === page) a.classList.add("is-active"); });

    updateSavedCount();
    initSearch();
    initDrawer();

    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
    $$(".reveal").forEach((el) => io.observe(el));
  }

  function footer() {
    const f = document.createElement("footer");
    f.className = "footer";
    f.innerHTML = `<div class="wrap">
      <div class="footer-top">
        <div class="footer-brand">
          <p class="big">Вкусовой <em>атлас</em></p>
          <p>Исследование сочетаний: 173 ингредиента, 3 801 связь и логика, по которой они работают.</p>
        </div>
        <div class="footer-cols">
          <div><h4>Разделы</h4><a href="index.html">Генератор</a><a href="atlas.html">Атлас</a><a href="combos.html">Трио</a><a href="method.html">Метод</a></div>
          <div><h4>Данные</h4><a href="atlas.html?cat=veg">Овощи</a><a href="atlas.html?cat=spice">Специи</a><a href="atlas.html?cat=fish">Рыба</a><a href="atlas.html?cat=sweet">Сладкое</a></div>
          <div><h4>О проекте</h4><a href="method.html#sources">Источники</a><a href="method.html#principles">Принципы</a><a href="method.html#limits">Ограничения</a></div>
        </div>
      </div>
      <div class="footer-bottom">
        <span>Вкусовой атлас · исследовательский проект</span>
        <span>Сочетания собраны по кулинарной литературе и практике</span>
        <span>${new Date().getFullYear()}</span>
      </div>
    </div>`;
    document.body.appendChild(f);
  }

  /* ---------- герой: созвездие ---------- */
  const FEATURED = ["tomato","basil","mozzarella","parmesan","garlic","olive_oil","lemon","salmon","dill","butter","beef","mushroom","red_wine","thyme","rosemary","lamb","chicken","honey","goat_cheese","fig","walnut","beet","orange","dark_chocolate","chili","cinnamon","coffee","cream","strawberry","balsamic","black_pepper","mint","watermelon","feta","cucumber","yogurt","ginger","lime","cilantro","coconut_milk","shrimp","rice","saffron","eggplant","tahini","pomegranate","cardamom","vanilla","pistachio","potato"];

  function initConstellation() {
    const cv = $("#constellation");
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const small = window.innerWidth < 640;
    const list = small ? FEATURED.filter((_, i) => i % 2 === 0) : FEATURED;
    const nodes = list.map((id, i) => {
      const a = i * 2.399963;
      const r = Math.sqrt((i + 0.6) / list.length) * 0.92;
      return { id, a, r, x: 0, y: 0, ph: i * 1.7, deg: 0 };
    });
    const cand = [];
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const e = edge(nodes[i].id, nodes[j].id);
      if (e && e.w === 3) cand.push({ i, j, w: e.w });
    }
    // разрежаем сеть: по две связи на узел, чтобы читался рисунок, а не клубок
    const links = [];
    const deg = new Array(nodes.length).fill(0);
    const used = new Set();
    const add = (l) => {
      const k = l.i + "-" + l.j;
      if (used.has(k)) return;
      used.add(k); links.push(l); deg[l.i]++; deg[l.j]++;
    };
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < nodes.length; i++) {
        if (deg[i] >= 2) continue;
        for (const l of cand) {
          if (l.i !== i && l.j !== i) continue;
          if (deg[i] >= 2) break;
          const o = l.i === i ? l.j : l.i;
          if (deg[o] >= 2) continue;
          add(l);
        }
      }
    }
    nodes.forEach((n, i) => (n.deg = deg[i]));
    let W = 0, H = 0, dpr = 1, hover = -1, t0 = performance.now(), raf = 0, visible = true;
    const ink = [23, 20, 15];
    const mix = (hex) => {
      const n = parseInt(hex.slice(1), 16);
      return [n >> 16, (n >> 8) & 255, n & 255];
    };
    const cols = {};
    for (const k in FA.CATS) cols[k] = mix(FA.CATS[k].color);

    function resize() {
      const rect = cv.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width; H = rect.height || rect.width * 0.98;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function pos(n, t) {
      const cx = W / 2, cy = H / 2;
      const R = Math.min(W, H) * 0.42;
      const a = n.a + Math.sin(t * 0.00006 + n.ph) * 0.03;
      const r = n.r * R;
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.94 };
    }

    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.46;

      // инструментальные окружности
      ctx.strokeStyle = "rgba(23,20,15,.12)";
      ctx.lineWidth = 1;
      [0.46, 0.72, 1].forEach((k) => { ctx.beginPath(); ctx.arc(cx, cy, R * k, 0, Math.PI * 2); ctx.stroke(); });
      ctx.setLineDash([2, 6]);
      ctx.strokeStyle = "rgba(23,20,15,.16)";
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.1, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);

      nodes.forEach((n) => { const p = pos(n, t); n.x = p.x; n.y = p.y; });

      // связи
      for (const l of links) {
        const a = nodes[l.i], b = nodes[l.j];
        const hot = hover === l.i || hover === l.j;
        ctx.strokeStyle = hot ? "rgba(178,75,29,.6)" : "rgba(23,20,15,.15)";
        ctx.lineWidth = hot ? 1.1 : 0.65;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const dx = b.x - a.x, dy = b.y - a.y;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(mx - dy * 0.1, my + dx * 0.1, b.x, b.y);
        ctx.stroke();
      }

      // узлы
      nodes.forEach((n, i) => {
        const isH = i === hover;
        const near = hover >= 0 && links.some((l) => (l.i === hover && l.j === i) || (l.j === hover && l.i === i));
        const c = cols[BY_ID[n.id].cat];
        const rad = isH ? 5.5 : near ? 4.2 : 2.5 + n.deg * 0.3;
        ctx.beginPath(); ctx.arc(n.x, n.y, rad, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
        ctx.fill();
        if (isH) {
          ctx.beginPath(); ctx.arc(n.x, n.y, 11, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(178,75,29,.8)"; ctx.lineWidth = 1; ctx.stroke();
        }
      });

      // подписи
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = "center";
      if (hover >= 0) {
        const n = nodes[hover];
        ctx.fillStyle = "rgba(23,20,15,.92)";
        ctx.fillText(BY_ID[n.id].name.toUpperCase(), n.x, n.y - 14);
        links.forEach((l) => {
          if (l.i !== hover && l.j !== hover) return;
          const o = nodes[l.i === hover ? l.j : l.i];
          ctx.fillStyle = "rgba(23,20,15,.55)";
          ctx.fillText(BY_ID[o.id].name.toUpperCase(), o.x, o.y - 11);
        });
      } else {
        ctx.fillStyle = "rgba(23,20,15,.38)";
        ["tomato", "salmon", "chocolate"].forEach((id) => {
          const n = nodes.find((x) => x.id === id);
          if (n) ctx.fillText(BY_ID[id].name.toUpperCase(), n.x, n.y - 12);
        });
      }
    }

    function loop(t) {
      if (!visible) return;
      draw(t);
      raf = requestAnimationFrame(loop);
    }

    function hit(e) {
      const r = cv.getBoundingClientRect();
      const x = (e.clientX ?? (e.touches && e.touches[0].clientX)) - r.left;
      const y = (e.clientY ?? (e.touches && e.touches[0].clientY)) - r.top;
      let best = -1, bd = 20;
      nodes.forEach((n, i) => { const d = Math.hypot(n.x - x, n.y - y); if (d < bd) { bd = d; best = i; } });
      return best;
    }
    cv.addEventListener("pointermove", (e) => {
      hover = hit(e);
      cv.style.cursor = hover >= 0 ? "pointer" : "crosshair";
      if (hover < 0) draw(performance.now());
    });
    cv.addEventListener("pointerleave", () => { hover = -1; draw(performance.now()); });
    cv.addEventListener("click", (e) => {
      const i = hit(e);
      if (i >= 0) location.href = "ingredient.html?id=" + nodes[i].id;
    });

    resize();
    draw(t0);
    const io = new IntersectionObserver((ents) => {
      visible = ents[0].isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(loop);
    }, { threshold: 0.05 });
    io.observe(cv);
    let rt;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { resize(); draw(performance.now()); }, 150); });
  }

  /* ---------- генератор ---------- */
  function initGenerator() {
    const box = $("#combo");
    if (!box) return;
    const state = { count: 3, mode: "balance", budget: "any", noMeat: false, noFish: false, season: "любой" };
    let current = null;

    function render(combo, animate = true) {
      current = combo;
      box.innerHTML = combo.map((id, i) => `
        <div class="combo-row ${animate ? "is-swap" : ""}" style="animation-delay:${i * 70}ms">
          <span class="idx">${String(i + 1).padStart(2, "0")}</span>
          <div class="name">${esc(BY_ID[id].name)}<small>${esc(FA.CATS[BY_ID[id].cat].short)} · ${priceWord[BY_ID[id].price]}</small></div>
          ${glyph(id, 78, "glyph")}
        </div>`).join("");
      const why = whyPairs(combo);
      $("#why").innerHTML = why.map((p) => `<div class="why-item">
        <span class="mark">✦</span>
        <span><span class="pair">${esc(name(p.a))} × ${esc(name(p.b))}</span> — ${esc(p.note || FA.REASONS[p.code].text)}</span>
      </div>`).join("");
      $("#comboUse").textContent = comboUse(combo);
      const saveBtn = $("#saveCombo");
      saveBtn.classList.toggle("is-on", isSaved(combo));
      saveBtn.innerHTML = isSaved(combo)
        ? `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-8-4.9-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 6.1-8 11-8 11z"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 20s-7-4.3-7-9.6A4.1 4.1 0 0112 7a4.1 4.1 0 017 3.4C19 15.7 12 20 12 20z"/></svg>`;
      updateShare();
    }

    function next(animate = true) {
      render(pickCombo(state), animate);
    }

    function updateShare() {
      const u = new URL(location.href);
      u.search = "";
      u.hash = "";
      u.searchParams.set("c", current.join(","));
      $("#shareCombo").dataset.url = u.toString();
    }

    $$("[data-count]").forEach((b) => b.addEventListener("click", () => {
      state.count = +b.dataset.count;
      $$("[data-count]").forEach((x) => x.classList.toggle("is-on", x === b));
      next();
    }));
    $$("[data-mode]").forEach((b) => b.addEventListener("click", () => {
      state.mode = b.dataset.mode;
      $$("[data-mode]").forEach((x) => x.classList.toggle("is-on", x === b));
      next();
    }));
    $$("[data-budget]").forEach((b) => b.addEventListener("click", () => {
      state.budget = b.dataset.budget;
      $$("[data-budget]").forEach((x) => x.classList.toggle("is-on", x === b));
      next();
    }));
    $$("[data-toggle]").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.toggle;
      state[k] = !state[k];
      b.classList.toggle("is-on", state[k]);
      next();
    }));
    $("#shuffle").addEventListener("click", () => next());
    $("#saveCombo").addEventListener("click", () => { toggleSaved(current); render(current, false); });
    $("#shareCombo").addEventListener("click", async (e) => {
      const url = e.currentTarget.dataset.url;
      try {
        if (navigator.share) await navigator.share({ title: "Вкусовой атлас", url });
        else { await navigator.clipboard.writeText(url); toast("Ссылка скопирована"); }
      } catch (err) { toast("Ссылку можно скопировать из адресной строки"); }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "r" && !/input|textarea/i.test(document.activeElement.tagName)) next();
    });

    const seed = new URLSearchParams(location.search).get("c");
    if (seed) {
      const ids = seed.split(",").filter((id) => BY_ID[id]);
      if (ids.length >= 2) { render(ids.slice(0, 4), false); return; }
    }
    const seedOne = new URLSearchParams(location.search).get("seed");
    if (seedOne && BY_ID[seedOne]) {
      const out = [seedOne];
      while (out.length < 3) {
        const cands = ADJ[out[out.length - 1]].filter((p) => !out.includes(p.id) && p.w >= 2 &&
          out.every((o) => { const e = edge(o, p.id); return e && e.w >= 2; }));
        if (!cands.length) break;
        out.push(sample(cands).id);
      }
      if (out.length === 3) { render(out, false); return; }
    }
    next(false);
  }

  /* ---------- главная ---------- */
  function initHome() {
    initConstellation();
    initGenerator();

    // счётчики
    const total = EDGES.size;
    $$("[data-total-edges]").forEach((el) => (el.textContent = nf(total)));
    $$("[data-total-ing]").forEach((el) => (el.textContent = FA.ING.length));

    // трио дня
    const wrap = $("#homeTrios");
    if (wrap) {
      const day = Math.floor(Date.now() / 86400000);
      const pool = FA.TRIOS.slice();
      const list = [];
      for (let i = 0; i < 7 && pool.length; i++) list.push(pool.splice((day * 7 + i * 13) % pool.length, 1)[0]);
      wrap.innerHTML = list.map((t, i) => trioCard(t, i)).join("");
    }

    // категории
    const cl = $("#catList");
    if (cl) {
      const counts = {};
      FA.ING.forEach((r) => (counts[r[3]] = (counts[r[3]] || 0) + 1));
      cl.innerHTML = Object.entries(FA.CATS).map(([k, c], i) => `
        <a class="cat-row" href="atlas.html?cat=${k}">
          <span class="n">${String(i + 1).padStart(2, "0")}</span>
          <span class="t">${esc(c.name)}</span>
          <span class="d">${catDesc(k)}</span>
          <span class="c">${counts[k] || 0} ${plural(counts[k] || 0, "ингредиент", "ингредиента", "ингредиентов")}</span>
          <span class="a">↗</span>
        </a>`).join("");
    }

    // карточки-образцы
    const sg = $("#homeSpecimens");
    if (sg) {
      const picks = ["tomato","salmon","dark_chocolate","saffron","fig","beef","yogurt","mango"];
      sg.innerHTML = picks.map((id) => specCard(id)).join("");
    }
  }

  function catDesc(k) {
    return {
      veg: "Кислота, сахар, умами — основа почти любого блюда.",
      fruit: "Сладость и кислота: от салата до соуса к мясу.",
      herb: "Летучие ароматы, которые меняются от тепла.",
      spice: "Тёплые, жгучие и смолистые ноты для глубины.",
      dairy: "Жир и кислота: связка, соус, фон.",
      meat: "Умами и жир, которым нужны кислота и жар.",
      fish: "Морской йод, нежность и жирность.",
      grain: "Нейтральная основа, которая держит соус.",
      nut: "Горечь, жир и хруст.",
      sweet: "Сахар, какао и карамель.",
      sauce: "Концентраты соли, кислоты и умами.",
      drink: "Кислота, танины и алкоголь как растворитель ароматов."
    }[k] || "";
  }

  function specCard(id) {
    const x = BY_ID[id];
    return `<a class="spec" href="ingredient.html?id=${id}">
      <div class="top">
        <span class="no">${CATNO[id]}</span>
        <span class="lat">${esc(x.lat)}</span>
      </div>
      ${glyph(id, 0, "glyph")}
      <div class="nm">${esc(x.name)}</div>
      <div class="meta">
        <span><i class="dot" style="background:${FA.CATS[x.cat].color}"></i>${esc(FA.CATS[x.cat].short)}</span>
        <span>${priceWord[x.price]}</span>
      </div>
      <div class="partners"><span class="pl">с</span> ${ADJ[id].slice(0, 3).map((p) => `<b>${esc(name(p.id))}</b>`).join(" · ")}</div>
    </a>`;
  }

  function trioCard(t, i) {
    return `<article class="trio reveal">
      <div class="n">${String(i + 1).padStart(2, "0")} / ${esc(t.season)}</div>
      <div class="glyphs">${t.ids.map((id) => glyph(id, 52)).join("")}</div>
      <h3>${esc(t.name)}</h3>
      <div class="comps">${t.ids.map(name).join(" · ")}</div>
      <p>${esc(t.note)}</p>
      <div class="foot">${t.tags.map((x) => `<span class="tag">${esc(x)}</span>`).join("")}<span class="tag">${priceWord[t.price]}</span></div>
    </article>`;
  }

  /* ---------- атлас ---------- */
  function initAtlas() {
    const grid = $("#atlasGrid");
    if (!grid) return;
    const params = new URLSearchParams(location.search);
    const state = {
      q: "",
      cat: params.get("cat") || "all",
      price: params.get("price") || "any",
      season: params.get("season") || "any",
      sort: params.get("sort") || "name"
    };
    const counts = {};
    FA.ING.forEach((r) => (counts[r[3]] = (counts[r[3]] || 0) + 1));

    const filters = $("#catFilters");
    filters.innerHTML = `<button class="filter ${state.cat === "all" ? "is-on" : ""}" data-cat="all">Все <span class="cnt">${FA.ING.length}</span></button>` +
      Object.entries(FA.CATS).map(([k, c]) => `<button class="filter ${state.cat === k ? "is-on" : ""}" data-cat="${k}">${esc(c.short)} <span class="cnt">${counts[k]}</span></button>`).join("");

    const search = $("#atlasSearch");
    const sort = $("#atlasSort");
    const priceSel = $("#priceFilter");
    const seasonSel = $("#seasonFilter");
    if (sort) sort.value = state.sort;
    if (priceSel) priceSel.value = state.price;
    if (seasonSel) seasonSel.value = state.season;

    function apply() {
      let list = FA.ING.map((r) => BY_ID[r[0]]);
      if (state.cat !== "all") list = list.filter((x) => x.cat === state.cat);
      if (state.price !== "any") list = list.filter((x) => x.price === +state.price);
      if (state.season !== "any") list = list.filter((x) => x.season === state.season || x.season === "круглый год");
      if (state.q) {
        const q = state.q.toLowerCase();
        list = list.filter((x) => (x.name + " " + x.lat + " " + x.tags.join(" ")).toLowerCase().includes(q));
      }
      if (state.sort === "degree") list.sort((a, b) => ADJ[b.id].length - ADJ[a.id].length);
      else if (state.sort === "price") list.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name, "ru"));
      else if (state.sort === "season") list.sort((a, b) => a.season.localeCompare(b.season, "ru") || a.name.localeCompare(b.name, "ru"));
      else list.sort((a, b) => a.name.localeCompare(b.name, "ru"));

      grid.innerHTML = list.length ? list.map((x) => specCard(x.id)).join("")
        : `<div class="empty" style="grid-column:1/-1"><b>Пусто</b>Попробуйте убрать один из фильтров.</div>`;
      $("#atlasCount").textContent = list.length + " из " + FA.ING.length;
      const u = new URL(location.href);
      u.search = "";
      if (state.cat !== "all") u.searchParams.set("cat", state.cat);
      if (state.price !== "any") u.searchParams.set("price", state.price);
      if (state.season !== "any") u.searchParams.set("season", state.season);
      if (state.sort !== "name") u.searchParams.set("sort", state.sort);
      history.replaceState(null, "", u);
    }

    $$("[data-cat]", filters).forEach((b) => b.addEventListener("click", () => {
      state.cat = b.dataset.cat;
      $$("[data-cat]", filters).forEach((x) => x.classList.toggle("is-on", x === b));
      apply();
    }));
    search.addEventListener("input", (e) => { state.q = e.target.value; apply(); });
    if (sort) sort.addEventListener("change", (e) => { state.sort = e.target.value; apply(); });
    if (priceSel) priceSel.addEventListener("change", (e) => { state.price = e.target.value; apply(); });
    if (seasonSel) seasonSel.addEventListener("change", (e) => { state.season = e.target.value; apply(); });

    apply();
  }

  /* ---------- ингредиент ---------- */
  function initIngredient() {
    const root = $("#ingRoot");
    if (!root) return;
    const id = new URLSearchParams(location.search).get("id") || "tomato";
    const x = BY_ID[id];
    if (!x) {
      root.innerHTML = `<div class="empty" style="padding:120px 0"><b>Не найдено</b>Такого ингредиента нет в атласе. <a class="link-underline" href="atlas.html">Вернуться в атлас</a></div>`;
      return;
    }
    document.title = x.name + " — Вкусовой атлас";
    const labels = ["сладость","кислота","горечь","соль","умами","жар","аромат"];
    const partners = ADJ[id];
    const groups = [
      { w: 3, t: "Классика", d: "Проверено традицией" },
      { w: 2, t: "Уверенно", d: "Работает в большинстве контекстов" },
      { w: 1, t: "Смело", d: "Неожиданно, но обоснованно" }
    ];
    const related = FA.TRIOS.filter((t) => t.ids.includes(id)).slice(0, 6);
    const sim = FA.ING.map((r) => BY_ID[r[0]]).filter((y) => y.id !== id)
      .map((y) => ({ y, s: cosine(x.taste, y.taste) }))
      .sort((a, b) => b.s - a.s).slice(0, 4);

    root.innerHTML = `
      <div class="page-head" style="border-bottom:0;padding-bottom:0">
        <div class="crumbs"><a href="index.html">Главная</a><span>/</span><a href="atlas.html">Атлас</a><span>/</span><span>${esc(FA.CATS[x.cat].name)}</span></div>
      </div>
      <section class="ing-head">
        <div class="ing-grid">
          <div class="ing-main">
            <h1>${esc(x.name)}</h1>
            <div class="lat">${esc(x.lat)}</div>
            <div class="ing-meta">
              <div><span>Категория</span><b>${esc(FA.CATS[x.cat].name)}</b></div>
              <div><span>Цена</span><b>${priceWord[x.price]}</b></div>
              <div><span>Сезон</span><b>${esc(x.season)}</b></div>
              <div><span>Связей</span><b>${partners.length}</b></div>
            </div>
          </div>
          <div class="ing-glyph"><div class="plate"><div class="plate-label"><span>Профиль</span><span>7 осей</span></div>${glyph(id, 300)}</div></div>
        </div>
      </section>
      <div class="ing-note">
        <p>${esc(x.note)}</p>
        <div class="taste">
          ${x.taste.map((v, i) => `<div class="taste-row"><span>${labels[i]}</span><span class="taste-bar"><i style="width:${(v / 3) * 100}%"></i></span><b>${v}</b></div>`).join("")}
        </div>
      </div>
      <div class="ing-cta">
        <a class="btn btn--sm" href="index.html?seed=${id}">Собрать трио с этим продуктом <span class="arrow">→</span></a>
        <span class="note">генератор подставит две сильные пары</span>
      </div>
      <section class="partners-wrap">
        <h2>Сочетается</h2>
        ${groups.map((g) => {
          const list = partners.filter((p) => p.w === g.w);
          if (!list.length) return "";
          return `<div class="pgroup"><div class="gl"><span>${g.t} — ${g.d}</span><i></i><span>${list.length}</span></div>
            <div class="pchips">${list.map((p) => `<a class="pchip" href="ingredient.html?id=${p.id}">${esc(name(p.id))}</a>`).join("")}</div></div>`;
        }).join("")}
      </section>
      ${related.length ? `<section class="partners-wrap"><h2>Трио с этим продуктом</h2>
        <div class="combo-grid">${related.map((t) => comboCard(t)).join("")}</div></section>` : ""}
      <section class="partners-wrap" style="border-bottom:0">
        <h2>Похожий профиль</h2>
        <div class="sim-grid">${sim.map(({ y }) => specCard(y.id)).join("")}</div>
      </section>`;
  }

  function cosine(a, b) {
    let d = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    return na && nb ? d / Math.sqrt(na * nb) : 0;
  }

  /* ---------- трио ---------- */
  function comboCard(t) {
    const why = whyPairs(t.ids)[0];
    return `<article class="combo-card reveal">
      <div class="head"><span class="n">${t.ids.map((id) => FA.CATS[BY_ID[id].cat].short).join(" / ")}</span><span class="tag">${priceWord[t.price]}</span></div>
      <div class="glyphs">${t.ids.map((id) => glyph(id, 46)).join("")}</div>
      <h3>${esc(t.name)}</h3>
      <div class="comps">${t.ids.map(name).join(" · ")}</div>
      <p>${esc(t.note)}</p>
      <div class="why-mini">${why ? `<b>${esc(name(why.a))} × ${esc(name(why.b))}</b> — ${esc(why.note || FA.REASONS[why.code].text)}` : ""}</div>
    </article>`;
  }

  function initCombos() {
    const grid = $("#comboGrid");
    if (!grid) return;
    const state = { tag: "all", price: "any", season: "any" };
    const tags = [...new Set(FA.TRIOS.flatMap((t) => t.tags))];
    const tf = $("#tagFilters");
    tf.innerHTML = `<button class="filter is-on" data-tag="all">Все <span class="cnt">${FA.TRIOS.length}</span></button>` +
      tags.map((t) => `<button class="filter" data-tag="${t}">${esc(t)}</button>`).join("");

    function apply() {
      let list = FA.TRIOS.slice();
      if (state.tag !== "all") list = list.filter((t) => t.tags.includes(state.tag));
      if (state.price !== "any") list = list.filter((t) => t.price === +state.price);
      if (state.season !== "any") list = list.filter((t) => t.season === state.season || t.season === "круглый год");
      grid.innerHTML = list.length ? list.map((t) => comboCard(t)).join("") : `<div class="empty" style="grid-column:1/-1"><b>Пусто</b>Попробуйте другой фильтр.</div>`;
      $("#comboCount").textContent = list.length + " из " + FA.TRIOS.length;
    }

    $$("[data-tag]", tf).forEach((b) => b.addEventListener("click", () => {
      state.tag = b.dataset.tag;
      $$("[data-tag]", tf).forEach((x) => x.classList.toggle("is-on", x === b));
      apply();
    }));
    $("#comboPrice").addEventListener("change", (e) => { state.price = e.target.value; apply(); });
    $("#comboSeason").addEventListener("change", (e) => { state.season = e.target.value; apply(); });

    const gen = $("#genTrio");
    if (gen) gen.addEventListener("click", () => {
      const ids = pickCombo({ count: 3, mode: "classic", budget: "any" });
      const card = comboCard({ ids, name: ids.map(name).join(" · "), note: comboUse(ids), tags: ["сгенерировано"], price: Math.max(...ids.map((i) => BY_ID[i].price)), season: "круглый год" });
      grid.insertAdjacentHTML("afterbegin", card);
      grid.firstElementChild.scrollIntoView({ behavior: "smooth", block: "center" });
      toast("Новое трио из базы");
    });

    apply();
  }

  /* ---------- метод ---------- */
  function initMethod() {
    const p = $("#principlesGrid");
    if (p) p.innerHTML = FA.PRINCIPLES.map((x) => `<div class="principle"><span class="n">${x.n}</span><div><h3>${esc(x.t)}</h3><p>${esc(x.d)}</p></div></div>`).join("");
    const s = $("#sources");
    if (s) s.innerHTML = FA.SOURCES.map((x) => `<div class="source"><span class="a">${esc(x.a)}</span><span class="t">${esc(x.t)}</span><span class="y">${esc(x.y)}</span><span class="note">${esc(x.note)}</span></div>`).join("");
    $$("[data-total-edges]").forEach((el) => (el.textContent = nf(EDGES.size)));
    $$("[data-total-ing]").forEach((el) => (el.textContent = FA.ING.length));
    $$("[data-total-tri]").forEach((el) => (el.textContent = nf(countTriangles())));
  }

  function countTriangles() {
    const ids = Object.keys(ADJ);
    let n = 0;
    for (const a of ids) {
      const na = ADJ[a];
      for (const b of na) {
        if (b.id <= a) continue;
        for (const c of ADJ[b.id]) {
          if (c.id <= b.id) continue;
          if (ADJ[a].some((z) => z.id === c.id)) n++;
        }
      }
    }
    return n;
  }

  /* ---------- запуск ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    initCommon();
    footer();
    const page = document.body.dataset.page;
    if (page === "home") initHome();
    if (page === "atlas") initAtlas();
    if (page === "ingredient") initIngredient();
    if (page === "combos") initCombos();
    if (page === "method") initMethod();
    // повторно наблюдаем за новыми .reveal
    const io = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { threshold: 0.06 });
    $$(".reveal").forEach((el) => io.observe(el));
    updateSavedCount();
  });
})();
