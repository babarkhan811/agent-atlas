(() => {
  const LESSONS = window.LESSONS;
  const CATEGORIES = ["Foundations", "Agents", "Knowledge", "Protocols", "Automation", "Cybersecurity automation", "Safety", "Production"];
  const KINDS = { user: "Person", app: "App / runtime", model: "AI model", tool: "Tool", data: "Data", external: "External", guard: "Guardrail" };
  const W = 1000, H = 540, NW = 170, NH = 64;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const app = document.getElementById("app");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // Theme
  const root = document.documentElement;
  try { const t = localStorage.getItem("theme"); if (t) root.dataset.theme = t; } catch {}
  document.getElementById("theme").onclick = () => {
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch {}
  };

  let timer = null, anim = null;
  const stop = () => { clearInterval(timer); timer = null; cancelAnimationFrame(anim); };

  function home() {
    const legend = Object.entries(KINDS).map(([k, v]) => `<span><i class="dot" style="background:var(--k-${k})"></i>${v}</span>`).join("");
    const cats = CATEGORIES.map((c) => {
      const items = LESSONS.filter((l) => l.category === c);
      if (!items.length) return "";
      const extra = c === "Cybersecurity automation" ? guideCard : "";
      return `<section class="cat"><h2>${c}</h2><div class="grid">${extra}${items.map(card).join("")}</div></section>`;
    }).join("");
    app.innerHTML = `
      <section class="hero">
        <div class="eyebrow">Interactive lessons</div>
        <h1>Watch AI agents work, one message at a time.</h1>
        <p>Step through how LLMs, tools, RAG, MCP, multi-agent teams, automations and AI-driven cybersecurity actually talk to each other, with every request decoded field by field.</p>
        <a class="cta" href="#/${LESSONS[0].id}">Start with the basics →</a>
      </section>
      <div class="legend">${legend}</div>
      ${cats}`;
    document.title = "Agent Atlas · See how AI agents work";
  }

  function card(l) {
    const kinds = [...new Set(l.nodes.map((n) => n.kind))];
    return `<a class="card" href="#/${l.id}">
      <div class="chips">${kinds.map((k) => `<i class="dot" style="background:var(--k-${k})"></i>`).join("")}</div>
      <h3>${esc(l.title)}</h3><p>${esc(l.summary)}</p>
      <span class="meta">${l.steps.length} steps →</span></a>`;
  }

  const guideCard = `<a class="card featured" href="#/guide">
      <div class="chips"><i class="dot" style="background:var(--k-guard)"></i><i class="dot" style="background:var(--k-tool)"></i><i class="dot" style="background:var(--k-app)"></i></div>
      <h3>Build guide: automate cybersecurity with software agents and AI</h3>
      <p>Automation ladder, architecture, step-by-step plan, tools, example code and safeguards.</p>
      <span class="meta">Read the guide →</span></a>`;

  function guide() {
    app.innerHTML = window.GUIDE_HTML;
    app.querySelectorAll("[data-jump]").forEach((a) => (a.onclick = (e) => {
      e.preventDefault();
      document.getElementById(a.dataset.jump).scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    }));
    document.title = "Build guide · Agent Atlas";
  }

  function glossary() {
    app.innerHTML = `<div class="crumbs"><a href="#/">Lessons</a> / Glossary</div>
      <div class="lesson-head"><h1>Glossary</h1><p>The words you'll hit most often, in plain English.</p></div>
      <div class="gloss">${window.GLOSSARY.map(([t, d]) => `<div><b>${esc(t)}</b><span>${esc(d)}</span></div>`).join("")}</div>`;
    document.title = "Glossary · Agent Atlas";
  }

  function lesson(l, startStep) {
    const pos = (id) => { const n = l.nodes.find((n) => n.id === id); return { x: (n.x / 100) * W, y: (n.y / 100) * H }; };
    const pairs = [...new Set(l.steps.filter((s) => s.from !== s.to).map((s) => [s.from, s.to].sort().join("|")))];
    const edges = pairs.map((p) => {
      const [a, b] = p.split("|"), A = pos(a), B = pos(b);
      return `<line class="edge" data-pair="${p}" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`;
    }).join("");
    const nodes = l.nodes.map((n) => {
      const { x, y } = pos(n.id);
      return `<g class="node" data-id="${n.id}" transform="translate(${x - NW / 2},${y - NH / 2})">
        <rect width="${NW}" height="${NH}" rx="14" style="stroke:var(--k-${n.kind})"/>
        <text x="${NW / 2}" y="27" text-anchor="middle">${esc(n.label)}</text>
        <text class="kind" x="${NW / 2}" y="47" text-anchor="middle">${KINDS[n.kind]}</text></g>`;
    }).join("");
    const idx = LESSONS.indexOf(l), prev = LESSONS[idx - 1], next = LESSONS[idx + 1];

    app.innerHTML = `
      <div class="crumbs"><a href="#/">Lessons</a> / ${l.category}</div>
      <div class="lesson-head"><h1>${esc(l.title)}</h1><p>${esc(l.summary)}</p></div>
      <div class="layout">
        <div class="panel">
          <div class="diagram-wrap">
            <svg class="diagram" viewBox="0 0 ${W} ${H}" role="img" aria-label="Diagram of ${esc(l.title)}">
              ${edges}${nodes}<g class="packet" id="packet" opacity="0"></g>
            </svg>
          </div>
          <div class="controls">
            <button class="btn" id="prev" type="button">← Back</button>
            <button class="btn primary" id="play" type="button">▶ Play</button>
            <button class="btn" id="next" type="button">Next →</button>
            <div class="progress"><div id="bar"></div></div>
            <span class="counter" id="count"></span>
          </div>
        </div>
        <div class="panel detail">
          <div id="detail" aria-live="polite"></div>
          <ol class="steps">${l.steps.map((s, i) => `<li><button type="button" data-i="${i}"><span class="num">${String(i + 1).padStart(2, "0")}</span>${esc(s.title)}</button></li>`).join("")}</ol>
        </div>
      </div>
      <div class="pager">
        ${prev ? `<a href="#/${prev.id}">← ${esc(prev.title)}</a>` : "<span></span>"}
        ${next ? `<a href="#/${next.id}">${esc(next.title)} →</a>` : `<a href="#/glossary">Glossary →</a>`}
      </div>`;
    document.title = `${l.title} · Agent Atlas`;

    const svg = app.querySelector("svg"), packet = svg.querySelector("#packet");
    let i = 0;

    function show(n) {
      i = Math.max(0, Math.min(l.steps.length - 1, n));
      const s = l.steps[i];
      const from = l.nodes.find((x) => x.id === s.from), to = l.nodes.find((x) => x.id === s.to);
      svg.querySelectorAll(".edge").forEach((e) => e.classList.toggle("active", e.dataset.pair === [s.from, s.to].sort().join("|")));
      svg.querySelectorAll(".node").forEach((e) => e.classList.toggle("active", e.dataset.id === s.from || e.dataset.id === s.to));
      app.querySelectorAll(".steps button").forEach((b) => b.classList.toggle("on", +b.dataset.i === i));
      app.querySelector("#detail").innerHTML = `
        <div class="route">${esc(from.label)} → ${esc(to.label)}</div>
        <h2>${esc(s.title)}</h2>
        ${s.text ? `<p>${esc(s.text)}</p>` : ""}
        <div class="payload"><div class="payload-title">${esc(s.label)}</div>
          ${s.payload.map(([k, v, note]) => `<div class="row"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div>${note ? `<div class="n">${esc(note)}</div>` : ""}</div>`).join("")}
        </div>`;
      app.querySelector("#prev").disabled = i === 0;
      app.querySelector("#next").disabled = i === l.steps.length - 1;
      app.querySelector("#bar").style.width = `${((i + 1) / l.steps.length) * 100}%`;
      app.querySelector("#count").textContent = `${i + 1} / ${l.steps.length}`;
      history.replaceState(null, "", `#/${l.id}/${i + 1}`);
      fly(pos(s.from), pos(s.to), s.label);
    }

    function fly(A, B, label) {
      cancelAnimationFrame(anim);
      const w = Math.max(60, label.length * 8.2 + 24);
      packet.innerHTML = `<rect x="${-w / 2}" y="-15" width="${w}" height="30" rx="15"/><text text-anchor="middle" y="5">${esc(label)}</text>`;
      packet.setAttribute("opacity", "1");
      const place = (t) => packet.setAttribute("transform", `translate(${A.x + (B.x - A.x) * t},${A.y + (B.y - A.y) * t})`);
      if (reduceMotion || (A.x === B.x && A.y === B.y)) return place(0.5);
      const t0 = performance.now(), dur = 1100;
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        place(p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
        if (p < 1) anim = requestAnimationFrame(tick);
      };
      anim = requestAnimationFrame(tick);
    }

    const playBtn = app.querySelector("#play");
    const setPlaying = (on) => {
      clearInterval(timer); timer = null;
      playBtn.textContent = on ? "❚❚ Pause" : "▶ Play";
      if (!on) return;
      if (i === l.steps.length - 1) show(0);
      timer = setInterval(() => (i < l.steps.length - 1 ? show(i + 1) : setPlaying(false)), 3400);
    };
    playBtn.onclick = () => setPlaying(!timer);
    app.querySelector("#prev").onclick = () => { setPlaying(false); show(i - 1); };
    app.querySelector("#next").onclick = () => { setPlaying(false); show(i + 1); };
    app.querySelectorAll(".steps button").forEach((b) => (b.onclick = () => { setPlaying(false); show(+b.dataset.i); }));
    keyHandler = (e) => {
      if (e.target.closest("input, textarea")) return;
      if (e.key === "ArrowRight") { setPlaying(false); show(i + 1); }
      if (e.key === "ArrowLeft") { setPlaying(false); show(i - 1); }
    };
    show(startStep);
  }

  let keyHandler = null;
  document.addEventListener("keydown", (e) => keyHandler && keyHandler(e));

  function route() {
    stop(); keyHandler = null;
    const [, id, step] = location.hash.replace(/^#\/?/, "/").split("/");
    const l = LESSONS.find((x) => x.id === id);
    if (l) lesson(l, (parseInt(step, 10) || 1) - 1);
    else if (id === "glossary") glossary();
    else if (id === "guide") guide();
    else home();
    if (!step || !l) scrollTo(0, 0);
  }
  addEventListener("hashchange", route);
  route();
})();
