(() => {
  const LESSONS = window.LESSONS;
  // [category, short tab name, stack-layer name]
  const CATS = [
    ["Foundations", "Basics", "Model"],
    ["Knowledge", "Knowledge", "Context"],
    ["Protocols", "Protocols", "Protocols"],
    ["Agents", "Agents", "Agents"],
    ["Automation", "Automation", "Automation"],
    ["Cybersecurity automation", "Security", "Security"],
    ["Safety", "Safety", "Safety"],
    ["Production", "Ops", "Ops"],
  ];
  const ORDER = CATS.flatMap(([c]) => LESSONS.filter((l) => l.category === c));
  const KIND = {
    user: { name: "Person", tag: "HUMAN" },
    app: { name: "Agent / app", tag: "AGENT" },
    model: { name: "AI model", tag: "LLM" },
    tool: { name: "Tool", tag: "TOOL" },
    data: { name: "Data", tag: "DATA" },
    external: { name: "External", tag: "API" },
    guard: { name: "Guardrail", tag: "POLICY" },
  };
  // Illustrative latency per hop, by the receiving component.
  const LAT = { model: 840, tool: 140, external: 210, data: 35, app: 6, guard: 12, user: 0 };
  const portraitMQ = matchMedia("(max-width: 700px)");
  let portrait = portraitMQ.matches, VW = portrait ? 600 : 1000, VH = portrait ? 1000 : 600;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const shell = $("#shell");
  const params = new URLSearchParams(location.search);
  const st = { l: null, i: 0, view: params.get("view") === "sequence" ? "sequence" : "diagram", timer: null, speed: 1, filter: "All", q: "" };
  let raf = 0, fadeT = 0;

  // ---------- isometric icon kit ----------
  const C30 = Math.cos(Math.PI / 6);
  const pt = (x, y, z = 0) => [+((x - y) * C30).toFixed(1), +((x + y) * 0.5 - z).toFixed(1)];
  const pts = (a) => a.map((p) => pt(...p).join(",")).join(" ");
  const poly = (a, c) => `<polygon class="${c}" points="${pts(a)}"/>`;
  const seg = (a, b, c = "ln") => {
    const [x1, y1] = pt(...a), [x2, y2] = pt(...b);
    return `<line class="${c}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  };
  const dot = (p, r = 2.4, c = "led") => { const [x, y] = pt(...p); return `<circle class="${c}" cx="${x}" cy="${y}" r="${r}"/>`; };
  const box = (x, y, z, w, d, h, p = "f") =>
    poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], `${p}r`) +
    poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], `${p}l`) +
    poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], `${p}t`);
  const shadow = (rx = 46) => `<ellipse class="shadow" cx="0" cy="6" rx="${rx}" ry="${rx * 0.46}"/>`;

  const ICONS = {
    server() {
      let s = shadow(40) + box(-16, -16, 0, 32, 32, 64);
      for (const z of [14, 27, 40, 53]) s += seg([-16, 16, z], [16, 16, z], "ln thin") + seg([16, -16, z], [16, 16, z], "ln thin") + dot([16, -9, z + 5], 1.7);
      return s;
    },
    laptop() {
      let s = shadow(46) + box(-28, -18, 0, 56, 36, 4);
      for (const y of [-11, -4, 3]) s += seg([-20, y, 4], [20, y, 4], "ln thin");
      s += poly([[-28, -18, 4], [28, -18, 4], [28, -27, 48], [-28, -27, 48]], "fs");
      [[0.28, 14], [0.46, 4], [0.64, 16], [0.8, -2]].forEach(([k, e]) => {
        const z = 4 + 44 * k, y = -18 - 9 * k;
        s += seg([-20, y, z], [e, y, z], "ln glow");
      });
      return s;
    },
    chip() {
      let s = shadow(50) + box(-26, -26, 0, 52, 52, 8);
      for (const i of [-17, -6, 5, 16]) s += seg([i, 26, 3], [i, 35, 1]) + seg([26, i, 3], [35, i, 1]);
      s += box(-14, -14, 8, 28, 28, 8, "c");
      const a = [-7, -6, 16], b = [7, -3, 16], c = [0, 8, 16];
      s += seg(a, b, "ln glow") + seg(b, c, "ln glow") + seg(c, a, "ln glow") + dot(a, 2.3) + dot(b, 2.3) + dot(c, 2.3);
      return s;
    },
    robot() {
      let s = shadow(42) + box(-22, -22, 0, 44, 44, 36);
      s += seg([-15, 22, 23], [-5, 22, 23], "eye") + seg([5, 22, 23], [15, 22, 23], "eye") + seg([-8, 22, 11], [8, 22, 11], "ln");
      s += seg([22, -12, 28], [22, 12, 28], "ln thin") + seg([22, -12, 8], [22, 12, 8], "ln thin");
      s += seg([0, 0, 36], [0, 0, 52], "ln") + dot([0, 0, 54], 3.4);
      return s;
    },
    tool() {
      let s = shadow(46) + box(-24, -24, 0, 48, 48, 22);
      const [gx, gy] = pt(0, 0, 22);
      s += `<ellipse class="gear" cx="${gx}" cy="${gy}" rx="19" ry="9.5"/><ellipse class="ln" cx="${gx}" cy="${gy}" rx="7" ry="3.5"/>`;
      s += seg([-24, 24, 9], [24, 24, 9], "ln thin") + seg([24, -24, 9], [24, 24, 9], "ln thin");
      return s;
    },
    db() {
      let s = shadow(40);
      for (let i = 0; i < 3; i++) {
        const b = -i * 19, h = 15;
        s += `<path class="fl" d="M-28 ${b} A28 13 0 0 0 28 ${b} L28 ${b - h} A28 13 0 0 1 -28 ${b - h} Z"/><ellipse class="ft" cx="0" cy="${b - h}" rx="28" ry="13"/><circle class="led" cx="17" cy="${b - 1}" r="1.8"/>`;
      }
      return s;
    },
    docs() {
      let s = shadow(44);
      for (let i = 0; i < 3; i++) s += box(-20 + i * 3, -26 - i * 3, i * 6, 40, 52, 4);
      for (const y of [-24, -14, -4, 6]) s += seg([-8, y, 16], [y === 6 ? 8 : 20, y, 16], "ln thin");
      return s;
    },
    mail() {
      return shadow(46) + box(-28, -18, 0, 56, 36, 12) + `<polyline class="ln glow" fill="none" points="${pts([[-28, -18, 12], [0, 2, 12], [28, -18, 12]])}"/>`;
    },
    browser() {
      let s = shadow(44) + box(-30, -4, 0, 60, 8, 4);
      s += poly([[-30, 0, 4], [30, 0, 4], [30, 0, 60], [-30, 0, 60]], "fs");
      s += seg([-30, 0, 51], [30, 0, 51], "ln thin");
      for (const x of [-25, -20, -15]) s += dot([x, 0, 55.5], 1.6);
      [[40, 18], [31, 4], [22, 22], [13, -6]].forEach(([z, e]) => (s += seg([-22, 0, z], [e, 0, z], "ln glow")));
      return s;
    },
    shield() {
      return shadow(38) +
        `<path class="fl" d="M0 -84 L31 -72 L31 -43 C31 -21 15 -8 0 -2 C-15 -8 -31 -21 -31 -43 L-31 -72 Z"/>` +
        `<path class="ft" d="M0 -75 L22 -67 L22 -44 C22 -28 11 -17 0 -12 C-11 -17 -22 -28 -22 -44 L-22 -67 Z"/>` +
        `<path class="check" d="M-10 -45 L-2 -36 L12 -55"/>`;
    },
    cloud() {
      return shadow(48) +
        `<path class="fl" d="M-36 -8 C-52 -8 -52 -34 -34 -36 C-34 -56 -10 -62 0 -48 C8 -66 38 -60 34 -38 C52 -38 52 -8 34 -8 Z"/>` +
        `<circle class="ft" cx="0" cy="-28" r="13"/><ellipse class="ln" cx="0" cy="-28" rx="5.5" ry="13"/><line class="ln" x1="-13" y1="-28" x2="13" y2="-28"/>`;
    },
    person() {
      return shadow(34) + `<path class="fl" d="M-24 0 C-24 -31 24 -31 24 0 Z"/><circle class="ft" cx="0" cy="-41" r="13"/>`;
    },
    chat() {
      return shadow(44) +
        `<path class="fl" d="M-34 -70 h44 a6 6 0 0 1 6 6 v18 a6 6 0 0 1 -6 6 h-30 l-10 9 v-9 h-4 a6 6 0 0 1 -6 -6 v-18 a6 6 0 0 1 6 -6 Z"/>` +
        `<path class="ft" d="M-4 -46 h34 a6 6 0 0 1 6 6 v16 a6 6 0 0 1 -6 6 h-4 v8 l-9 -8 h-21 a6 6 0 0 1 -6 -6 v-16 a6 6 0 0 1 6 -6 Z"/>` +
        `<circle class="led" cx="5" cy="-32" r="2"/><circle class="led" cx="13" cy="-32" r="2"/><circle class="led" cx="21" cy="-32" r="2"/>`;
    },
  };
  const BY_KIND = { user: "person", app: "robot", model: "chip", tool: "tool", data: "db", external: "cloud", guard: "shield" };
  function iconFor(n) {
    if (n.icon) return n.icon;
    if (n.kind === "guard") return "shield";
    if (n.kind === "user") return "person";
    const s = n.label.toLowerCase();
    if (/laptop/.test(s)) return "laptop";
    if (/server/.test(s) && !/mcp/.test(s)) return /mail/.test(s) ? "mail" : "server";
    if (/inbox|mail/.test(s)) return "mail";
    if (/browser|web page|portal/.test(s)) return "browser";
    if (/chat|ticket/.test(s)) return "chat";
    if (/docs|file|repo|test case|evidence/.test(s)) return "docs";
    if (/siem|log|database|store|vector|context|crm|hr system|results/.test(s)) return "db";
    return BY_KIND[n.kind];
  }

  // ---------- helpers ----------
  const node = (id) => st.l.nodes.find((n) => n.id === id);
  const pairKey = (s) => [s.from, s.to].sort().join("|");
  // Portrait screens swap axes so the diagram runs top to bottom.
  const NX = (n) => (portrait ? 80 + (n.y / 100) * 440 : 70 + (n.x / 100) * 860);
  const NY = (n) => (portrait ? 110 + (n.x / 100) * 790 : 100 + (n.y / 100) * 405);
  const typeOf = (s) => KIND[node(s.to).kind].tag;
  const bytes = (s) => JSON.stringify(s.payload.map(([k, v]) => [k, v])).length;
  function times(l) {
    let t = 0;
    return l.steps.map((s) => (t += LAT[l.nodes.find((n) => n.id === s.to).kind] + 4));
  }
  const fmtT = (ms) => (ms / 1000).toFixed(3) + "s";
  const cat = (c) => CATS.find((x) => x[0] === c);

  // ---------- theme ----------
  const root = document.documentElement;
  try { const t = params.get("theme") || localStorage.getItem("atlas-theme"); if (t) root.dataset.theme = t; } catch {}
  const themeBtn = $("#theme");
  const syncTheme = () => (themeBtn.textContent = root.dataset.theme === "light" ? "☾" : "☀");
  themeBtn.onclick = () => {
    root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
    try { localStorage.setItem("atlas-theme", root.dataset.theme); } catch {}
    syncTheme();
  };
  syncTheme();

  // ---------- top stack + sidebar ----------
  function renderStack() {
    const active = st.l && !shell.classList.contains("pagemode") ? st.l.category : null;
    $("#stack").innerHTML = `<span class="stack-label">AGENT STACK</span><div class="stack-row">${CATS.map(([c, , name], k) =>
      `<button type="button" class="layer ${c === active ? "on" : ""}" data-cat="${esc(c)}" title="${esc(name)}"><b>${k + 1}</b><span>${esc(name)}</span></button>`).join("")}</div>`;
    $$("#stack .layer").forEach((b) => (b.onclick = () => { st.filter = b.dataset.cat; renderSide(); openDrawer(true); }));
  }

  function renderSide() {
    const tabs = [["All", "All", ORDER.length], ...CATS.map(([c, short]) => [c, short, ORDER.filter((l) => l.category === c).length])];
    $("#tabs").innerHTML = tabs.map(([c, short, n]) =>
      `<button type="button" class="tab ${st.filter === c ? "on" : ""}" data-cat="${esc(c)}">${esc(short)} <i>${n}</i></button>`).join("");
    $$("#tabs .tab").forEach((b) => (b.onclick = () => { st.filter = b.dataset.cat; renderSide(); }));
    const q = st.q.trim().toLowerCase();
    const items = ORDER.filter((l) => (st.filter === "All" || l.category === st.filter) &&
      (!q || (l.title + " " + l.summary + " " + l.category).toLowerCase().includes(q)));
    $("#count").textContent = items.length;
    let html = "", lastCat = "";
    for (const l of items) {
      if (l.category !== lastCat && st.filter === "All") { html += `<div class="group">${esc(cat(l.category)[1])}</div>`; lastCat = l.category; }
      const on = st.l === l && !shell.classList.contains("pagemode");
      const kinds = [...new Set(l.nodes.map((n) => n.kind))];
      html += `<a class="li ${on ? "on" : ""}" href="#/${l.id}">
        <span class="li-dot"></span>
        <span class="li-body"><span class="li-t">${esc(l.title)}</span><span class="li-s">${esc(l.summary)}</span>
        <span class="li-k">${kinds.map((k) => `<i style="background:var(--k-${k})"></i>`).join("")}<em>${l.steps.length} msgs</em></span></span>
        <span class="chev">›</span></a>`;
      if (on) html += `<ol class="li-steps">${l.steps.map((s, k) =>
        `<li><button type="button" data-i="${k}" class="${k === st.i ? "on" : ""}"><b>${k + 1}</b><span>${esc(s.title)}</span></button></li>`).join("")}</ol>`;
    }
    $("#list").innerHTML = html || `<p class="empty">No lessons match “${esc(st.q)}”.</p>`;
    $$("#list .li-steps button").forEach((b) => (b.onclick = () => { stopPlay(); show(+b.dataset.i); openDrawer(false); }));
    $$("#list a.li").forEach((a) => a.addEventListener("click", () => openDrawer(false)));
    const on = $("#list a.li.on");
    if (on) on.scrollIntoView({ block: "nearest" });
  }

  const openDrawer = (on) => { if (matchMedia("(max-width: 860px)").matches) shell.classList.toggle("drawer", on); };
  $("#menu").onclick = () => shell.classList.toggle("drawer");
  $("#scrim").onclick = () => shell.classList.remove("drawer");
  $("#q").addEventListener("input", (e) => { st.q = e.target.value; renderSide(); });

  // ---------- stage ----------
  function diagramSVG(l) {
    const pairs = new Map();
    l.steps.forEach((s) => { if (s.from !== s.to && !pairs.has(pairKey(s))) pairs.set(pairKey(s), [...[s.from, s.to].sort()]); });
    let defs = `<defs>
      <pattern id="iso" width="${(40 * C30).toFixed(2)}" height="23.09" patternUnits="userSpaceOnUse" patternTransform="scale(1.3)">
        <path d="M0 11.55 L${(20 * C30).toFixed(2)} 0 L${(40 * C30).toFixed(2)} 11.55 L${(20 * C30).toFixed(2)} 23.09 Z" class="gridline"/></pattern>
      <radialGradient id="fade" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <mask id="vign"><rect width="${VW}" height="${VH}" fill="url(#fade)"/></mask>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>`;
    let edges = "", amb = "";
    let k = 0;
    for (const [key, [a, b]] of pairs) {
      const A = l.nodes.find((n) => n.id === a), B = l.nodes.find((n) => n.id === b);
      const x1 = NX(A), y1 = NY(A) - 26, x2 = NX(B), y2 = NY(B) - 26;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1;
      const bend = 0.1;
      const cx = mx - dy * bend, cy = my + dx * bend;
      edges += `<path id="e${k}" class="edge" data-pair="${key}" data-a="${a}" d="M${x1} ${y1} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2} ${y2}"/>`;
      if (!reduce) amb += `<circle class="amb" r="2"><animateMotion dur="${(3.2 + (k % 3) * 0.7).toFixed(1)}s" begin="${(k * 0.45).toFixed(2)}s" repeatCount="indefinite"><mpath href="#e${k}"/></animateMotion></circle>`;
      k++;
    }
    const nodes = l.nodes.map((n, j) => {
      const tag = KIND[n.kind].tag;
      return `<g class="node" data-id="${n.id}" transform="translate(${NX(n)},${NY(n)})" style="--c:var(--k-${n.kind})">
        <ellipse class="ring" cx="0" cy="6" rx="58" ry="26"/>
        <g class="float" style="animation-delay:${(-j * 0.7).toFixed(1)}s"><g transform="scale(1.15)">${ICONS[iconFor(n)]()}</g></g>
        <text class="nl" y="48" text-anchor="middle">${esc(n.label)}</text>
        <text class="nt" y="65" text-anchor="middle">${tag}</text></g>`;
    }).join("");
    return `<svg class="diagram" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Animated diagram: ${esc(l.title)}">
      ${defs}<rect width="${VW}" height="${VH}" fill="url(#iso)" mask="url(#vign)"/>
      <g class="edges">${edges}</g><g class="ambient">${amb}</g><g class="nodes">${nodes}</g>
      <g id="pkt" class="pkt" opacity="0"></g></svg>`;
  }

  function sequenceSVG(l) {
    const n = l.nodes.length, colW = 150, W = Math.max(640, 40 + n * colW), row = 56, H = l.steps.length * row + 24;
    const cx = (k) => (W - n * colW) / 2 + colW * (k + 0.5);
    const col = (id) => l.nodes.findIndex((x) => x.id === id);
    let head = `<div class="seq-top"><svg class="seq" viewBox="0 0 ${W} 104" role="presentation">`;
    let s = `<svg class="seq" viewBox="0 0 ${W} ${H}" role="img" aria-label="Sequence diagram: ${esc(l.title)}">`;
    l.nodes.forEach((nd, k) => {
      head += `<g class="node seq-head" style="--c:var(--k-${nd.kind})" transform="translate(${cx(k)},56)">
        <g transform="scale(.5)">${ICONS[iconFor(nd)]()}</g>
        <text class="nl" y="26" text-anchor="middle">${esc(nd.label)}</text></g>
        <line class="life" x1="${cx(k)}" y1="90" x2="${cx(k)}" y2="104" style="stroke:var(--k-${nd.kind})"/>`;
      s += `<line class="life" x1="${cx(k)}" y1="0" x2="${cx(k)}" y2="${H}" style="stroke:var(--k-${nd.kind})"/>`;
    });
    head += "</svg></div>";
    l.steps.forEach((st_, k) => {
      const a = cx(col(st_.from)), b = cx(col(st_.to)), y = k * row + 38, dir = b > a ? 1 : -1;
      const color = `var(--k-${l.nodes[col(st_.to)].kind})`;
      s += `<g class="sq-msg future" data-i="${k}" style="--c:${color}">
        <rect class="sq-hit" x="0" y="${y - 30}" width="${W}" height="${row}"/>
        <circle class="sq-n" cx="22" cy="${y - 6}" r="11"/><text class="sq-nt" x="22" y="${y - 2}" text-anchor="middle">${k + 1}</text>
        <line class="sq-line" x1="${a}" y1="${y}" x2="${b - dir * 8}" y2="${y}"/>
        <polygon class="sq-head" points="${b},${y} ${b - dir * 11},${y - 5.5} ${b - dir * 11},${y + 5.5}"/>
        <text class="sq-label" x="${(a + b) / 2}" y="${y - 9}" text-anchor="middle">${esc(st_.label)}</text></g>`;
    });
    return head + s + "</svg>";
  }

  function renderStage() {
    const l = st.l;
    $("#stage").innerHTML = `
      <div class="stage-bar">
        <div class="stage-head">
          <div class="eyebrow">${esc(cat(l.category)[1])} · LESSON ${String(ORDER.indexOf(l) + 1).padStart(2, "0")}</div>
          <h1>${esc(l.title)}</h1>
        </div>
        <div class="seg-toggle" role="tablist">
          <button type="button" data-view="diagram" class="${st.view === "diagram" ? "on" : ""}">◆ NETWORK</button>
          <button type="button" data-view="sequence" class="${st.view === "sequence" ? "on" : ""}">≡ SEQUENCE</button>
        </div>
      </div>
      <div class="stage-body ${st.view}">${st.view === "diagram" ? diagramSVG(l) : sequenceSVG(l)}</div>
      <div class="caption" id="caption" aria-live="polite"></div>`;
    $$("#stage .seg-toggle button").forEach((b) => (b.onclick = () => { st.view = b.dataset.view; renderStage(); show(st.i, false); }));
    $$("#stage .sq-msg").forEach((g) => (g.onclick = () => { stopPlay(); show(+g.dataset.i); }));
  }

  // ---------- trace ----------
  function renderTrace() {
    const l = st.l, T = times(l);
    $("#trace").innerHTML = `
      <div class="trace-bar">
        <div class="panel-title">MESSAGE TRACE</div>
        <div class="legend small">${["LLM", "TOOL", "DATA", "API", "AGENT", "POLICY", "HUMAN"].map((t) => {
          const k = Object.keys(KIND).find((x) => KIND[x].tag === t);
          return `<span><i style="background:var(--k-${k})"></i>${t}</span>`;
        }).join("")}<em>timings illustrative</em></div>
        <div class="controls">
          <select id="speed" aria-label="Playback speed">${[0.5, 1, 1.5, 2].map((v) => `<option value="${v}" ${v === st.speed ? "selected" : ""}>${v}×</option>`).join("")}</select>
          <button type="button" class="ctl" id="prev" aria-label="Previous step">‹</button>
          <button type="button" class="ctl primary" id="play">▶ PLAY</button>
          <button type="button" class="ctl" id="next">STEP ›</button>
          <button type="button" class="ctl" id="reset">↺ RESET</button>
        </div>
      </div>
      <div class="table-scroll"><table class="tt">
        <thead><tr><th>NO.</th><th>TIME</th><th>SOURCE</th><th>DESTINATION</th><th>TYPE</th><th>INFO</th><th>SIZE</th></tr></thead>
        <tbody>${l.steps.map((s, k) => {
          const to = node(s.to), from = node(s.from);
          return `<tr data-i="${k}" style="--c:var(--k-${to.kind})"><td><span class="no">${k + 1}</span></td><td>${fmtT(T[k])}</td>
            <td>${esc(from.label)}</td><td>${esc(to.label)}</td><td><span class="type">${typeOf(s)}</span></td>
            <td class="info"><b>${esc(s.label)}</b> · ${esc(s.title)}</td><td>${bytes(s)} B</td></tr>`;
        }).join("")}</tbody></table></div>`;
    $("#speed").onchange = (e) => { st.speed = +e.target.value; if (st.timer) { stopPlay(); startPlay(); } };
    $("#prev").onclick = () => { stopPlay(); show(st.i - 1); };
    $("#next").onclick = () => { stopPlay(); show(st.i + 1); };
    $("#reset").onclick = () => { stopPlay(); show(0); };
    $("#play").onclick = () => (st.timer ? stopPlay() : startPlay());
    $$("#trace tbody tr").forEach((r) => (r.onclick = () => { stopPlay(); show(+r.dataset.i); }));
  }

  // ---------- inspector ----------
  function renderInspector() {
    const l = st.l, T = times(l);
    const idx = ORDER.indexOf(l), next = ORDER[idx + 1], prev = ORDER[idx - 1];
    $("#inspector").innerHTML = `
      <div class="panel-title">LESSON OVERVIEW</div>
      <div class="ov">
        <div class="ov-top"><h2>${esc(l.title)}</h2><span class="badge"><i></i>LIVE</span></div>
        <p class="ov-sum">${esc(l.summary)}</p>
        <div class="stats">
          <div><small>LAYER</small><b>${CATS.findIndex((c) => c[0] === l.category) + 1}</b><span>${esc(cat(l.category)[2])}</span></div>
          <div><small>MESSAGES</small><b>${l.steps.length}</b><span>hops</span></div>
          <div><small>RUN TIME</small><b>${(T[T.length - 1] / 1000).toFixed(2)}</b><span>seconds</span></div>
        </div>
        <div class="comps">${l.nodes.map((n) => `<span class="chip" style="--c:var(--k-${n.kind})">${esc(n.label)}</span>`).join("")}</div>
      </div>
      <div class="panel-title sub">DECODED MESSAGE</div>
      <div class="msg" id="msg"></div>
      <div class="pager">
        ${prev ? `<a href="#/${prev.id}">‹ ${esc(prev.title)}</a>` : "<span></span>"}
        ${next ? `<a href="#/${next.id}">${esc(next.title)} ›</a>` : `<a href="#/guide">Build guide ›</a>`}
      </div>`;
  }

  function renderMsg() {
    const l = st.l, s = l.steps[st.i], A = node(s.from), B = node(s.to);
    const raw = "{\n" + s.payload.map(([k, v]) => `  <span class="jk">"${esc(k)}"</span>: <span class="jv">${esc(/^[\[{"\d]/.test(v) ? v : JSON.stringify(v))}</span>`).join(",\n") + "\n}";
    $("#msg").innerHTML = `
      <div class="msg-no">MSG ${String(st.i + 1).padStart(2, "0")} / ${String(l.steps.length).padStart(2, "0")}<span class="type" style="--c:var(--k-${B.kind})">${typeOf(s)}</span></div>
      <div class="route"><span class="chip" style="--c:var(--k-${A.kind})">${esc(A.label)}</span><span class="arrow">→</span><span class="chip" style="--c:var(--k-${B.kind})">${esc(B.label)}</span></div>
      <h3>${esc(s.title)}</h3>
      ${s.text ? `<p>${esc(s.text)}</p>` : ""}
      <div class="fields"><div class="fields-h">${esc(s.label)}</div>
        ${s.payload.map(([k, v, note]) => `<div class="f"><div class="fk">${esc(k)}</div><div class="fv">${esc(v)}</div>${note ? `<div class="fn">${esc(note)}</div>` : ""}</div>`).join("")}
      </div>
      <details class="raw"><summary>Raw payload</summary><pre>${raw}</pre></details>`;
  }

  // ---------- playback ----------
  function show(i, fly = true) {
    const l = st.l;
    st.i = Math.max(0, Math.min(l.steps.length - 1, i));
    const s = l.steps[st.i], A = node(s.from), B = node(s.to);
    $$("#stage .edge").forEach((e) => {
      const on = e.dataset.pair === pairKey(s);
      e.classList.toggle("on", on);
      e.classList.toggle("rev", on && e.dataset.a !== s.from);
      e.style.setProperty("--c", `var(--k-${B.kind})`);
    });
    $$("#stage .diagram .node").forEach((n) => {
      n.classList.toggle("on", n.dataset.id === s.from || n.dataset.id === s.to);
      n.classList.toggle("src", n.dataset.id === s.from);
    });
    $$("#stage .sq-msg").forEach((g, k) => g.setAttribute("class", `sq-msg ${k < st.i ? "past" : k === st.i ? "now" : "future"}`));
    const cur = $(`#stage .sq-msg[data-i="${st.i}"]`);
    if (cur && st.view === "sequence") {
      const body = $("#stage .stage-body");
      const y = cur.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop;
      body.scrollTo({ top: Math.max(0, y - body.clientHeight / 2), behavior: reduce ? "auto" : "smooth" });
    }
    $$("#trace tbody tr").forEach((r, k) => (r.className = k < st.i ? "past" : k === st.i ? "now" : "future"));
    const row = $(`#trace tbody tr[data-i="${st.i}"]`), sc = $("#trace .table-scroll");
    if (row && sc) sc.scrollTo({ top: Math.max(0, row.offsetTop - sc.clientHeight / 2), behavior: reduce ? "auto" : "smooth" });
    $$("#list .li-steps button").forEach((b) => b.classList.toggle("on", +b.dataset.i === st.i));
    $("#caption").innerHTML = `<span class="cap-n">${String(st.i + 1).padStart(2, "0")}</span>
      <span class="cap-t"><b>${esc(s.title)}</b><small>${esc(A.label)} → ${esc(B.label)} · <code>${esc(s.label)}</code></small></span>`;
    renderMsg();
    $("#prev").disabled = st.i === 0;
    $("#next").disabled = st.i === l.steps.length - 1;
    history.replaceState(null, "", `#/${l.id}/${st.i + 1}`);
    if (st.view === "diagram") flyPacket(s, B, fly);
  }

  function flyPacket(s, B, animate) {
    cancelAnimationFrame(raf); clearTimeout(fadeT);
    const pkt = $("#pkt"), edge = $(`#stage .edge[data-pair="${pairKey(s)}"]`);
    if (!pkt || !edge) return;
    const w = Math.max(64, s.label.length * 7.6 + 30);
    pkt.style.setProperty("--c", `var(--k-${B.kind})`);
    pkt.innerHTML = [5, 4, 3, 2, 1].map((k) => `<circle class="trail" r="${(6 - k) * 0.9}" opacity="${(0.12 * (6 - k)).toFixed(2)}"/>`).join("") +
      `<g class="cap"><rect x="${-w / 2}" y="-14" width="${w}" height="28" rx="14"/><circle class="cap-dot" cx="${-w / 2 + 14}" cy="0" r="4"/><text x="${7}" y="4.5" text-anchor="middle">${esc(s.label)}</text></g>`;
    const len = edge.getTotalLength(), rev = edge.dataset.a !== s.from;
    const at = (p) => edge.getPointAtLength(len * (rev ? 1 - p : p));
    const trails = $$(".trail", pkt), cap = $(".cap", pkt);
    const place = (p) => {
      const P = at(p);
      cap.setAttribute("transform", `translate(${P.x},${P.y - 30})`);
      trails.forEach((t, k) => { const Q = at(Math.max(0, p - (5 - k) * 0.035)); t.setAttribute("cx", Q.x); t.setAttribute("cy", Q.y); });
    };
    pkt.setAttribute("opacity", "1");
    pkt.classList.remove("gone");
    const arrive = () => {
      const target = $(`#stage .diagram .node[data-id="${s.to}"]`);
      if (target) { target.classList.remove("hit"); void target.getBBox(); target.classList.add("hit"); }
    };
    if (!animate || reduce) { place(1); arrive(); return; }
    const t0 = performance.now(), dur = 1300 / st.speed;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur), e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      place(e);
      if (p < 1) raf = requestAnimationFrame(tick);
      else arrive();
    };
    raf = requestAnimationFrame(tick);
  }

  function startPlay() {
    const l = st.l;
    if (st.i >= l.steps.length - 1) show(0);
    $("#play").textContent = "❚❚ PAUSE";
    $("#play").classList.add("playing");
    const loop = () => {
      st.timer = setTimeout(() => {
        if (st.i < l.steps.length - 1) { show(st.i + 1); loop(); } else stopPlay();
      }, 3600 / st.speed);
    };
    st.timer = 1;
    loop();
  }
  function stopPlay() {
    clearTimeout(st.timer); st.timer = null;
    const b = $("#play");
    if (b) { b.textContent = "▶ PLAY"; b.classList.remove("playing"); }
  }

  // ---------- pages ----------
  function openLesson(l, step) {
    shell.classList.remove("pagemode");
    st.l = l;
    renderStage(); renderTrace(); renderInspector(); renderSide(); renderStack();
    show(step, true);
    document.title = `${l.title} · Agent Atlas`;
  }

  function openPage(kind) {
    shell.classList.add("pagemode");
    const page = $("#page");
    if (kind === "guide") {
      page.innerHTML = window.GUIDE_HTML;
      $$("[data-jump]", page).forEach((a) => (a.onclick = (e) => {
        e.preventDefault();
        document.getElementById(a.dataset.jump).scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
      }));
      document.title = "Build guide · Agent Atlas";
    } else {
      page.innerHTML = `<div class="crumbs"><a href="#/">Lessons</a> / Glossary</div>
        <div class="lesson-head"><h1>Glossary</h1><p>The words you'll hit most often, in plain English.</p></div>
        <div class="gloss">${window.GLOSSARY.map(([t, d]) => `<div><b>${esc(t)}</b><span>${esc(d)}</span></div>`).join("")}</div>`;
      document.title = "Glossary · Agent Atlas";
    }
    page.scrollTop = 0;
    renderSide(); renderStack();
  }

  function route() {
    stopPlay(); cancelAnimationFrame(raf);
    const [, id, step] = location.hash.replace(/^#\/?/, "/").split("/");
    if (id === "guide" || id === "glossary") return openPage(id);
    const l = LESSONS.find((x) => x.id === id) || ORDER[0];
    if (l !== st.l || shell.classList.contains("pagemode")) openLesson(l, (parseInt(step, 10) || 1) - 1);
    else show((parseInt(step, 10) || 1) - 1);
  }

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openDrawer(true); $("#q").focus(); return; }
    if (e.target.closest("input, select, textarea") || shell.classList.contains("pagemode") || !st.l) return;
    if (e.key === "ArrowRight") { stopPlay(); show(st.i + 1); }
    else if (e.key === "ArrowLeft") { stopPlay(); show(st.i - 1); }
    else if (e.key === " ") { e.preventDefault(); st.timer ? stopPlay() : startPlay(); }
  });
  portraitMQ.addEventListener("change", () => {
    portrait = portraitMQ.matches; VW = portrait ? 600 : 1000; VH = portrait ? 1000 : 600;
    if (st.l && !shell.classList.contains("pagemode")) { renderStage(); show(st.i, false); }
  });
  addEventListener("hashchange", route);
  route();
})();
