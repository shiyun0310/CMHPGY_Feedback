(() => {
  const ENDPOINT = (window.FEEDBACK_CONFIG && window.FEEDBACK_CONFIG.ENDPOINT) || "";
  const DEMO = new URLSearchParams(location.search).has("demo");
  const KEY_STORE = "dddddd-key";
  const PAGE = 20;
  const DAY = 86400000;

  const $ = (sel) => document.querySelector(sel);
  const login = $("#login");
  const loginForm = $("#loginForm");
  const keyInput = $("#key");
  const loginBtn = $("#loginBtn");
  const loginError = $("#loginError");
  const board = $("#board");
  const topActions = $("#topActions");
  const chartEl = $("#chart");
  const tip = $("#tip");
  const listEl = $("#list");
  const moreBtn = $("#moreBtn");

  const state = { rows: [], days: 30, q: "", shown: PAGE, filtered: [] };

  /* ---------- 小工具 ---------- */
  const storage = {
    get: () => { try { return sessionStorage.getItem(KEY_STORE) || ""; } catch (_) { return ""; } },
    set: (v) => { try { sessionStorage.setItem(KEY_STORE, v); } catch (_) {} },
    clear: () => { try { sessionStorage.removeItem(KEY_STORE); } catch (_) {} },
  };

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const startOfWeek = (d) => {
    const s = startOfDay(d);
    s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); // 週一開始
    return s;
  };
  const pad = (n) => String(n).padStart(2, "0");
  const fmtMD = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
  const fmtFull = (d) =>
    `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const relTime = (d) => {
    const diff = Date.now() - d.getTime();
    if (diff < 3600000) return `${Math.max(1, Math.round(diff / 60000))} 分鐘前`;
    if (diff < DAY) return `${Math.round(diff / 3600000)} 小時前`;
    if (diff < 30 * DAY) return `${Math.round(diff / DAY)} 天前`;
    return fmtMD(d);
  };

  /* ---------- 讀取資料 ---------- */
  async function fetchRows(key) {
    if (DEMO || !ENDPOINT) return demoRows();
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "list", key }),
    });
    const data = await res.json();
    if (!data.ok) {
      const err = new Error(data.error || "error");
      err.code = data.error;
      throw err;
    }
    return data.rows;
  }

  function normalize(rows) {
    return rows
      .map((r) => ({ date: new Date(r.timestamp), say: String(r.say || ""), better: String(r.better || "") }))
      .filter((r) => !isNaN(r.date))
      .sort((a, b) => b.date - a.date);
  }

  async function load(key, { silent } = {}) {
    if (silent) board.classList.add("loading");
    const rows = await fetchRows(key);
    state.rows = normalize(rows);
    board.classList.remove("loading");
    render();
  }

  /* ---------- 登入 ---------- */
  function showBoard() {
    login.hidden = true;
    board.hidden = false;
    topActions.hidden = false;
    $("#demoNote").hidden = !(DEMO || !ENDPOINT);
    render(); // 顯示後再畫一次，圖表才量得到正確寬度
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const key = keyInput.value.trim();
    if (!key) return;
    loginError.hidden = true;
    loginBtn.disabled = true;
    loginBtn.textContent = "確認中…";
    try {
      await load(key);
      storage.set(key);
      showBoard();
    } catch (err) {
      loginError.textContent =
        err.code === "unauthorized" ? "密碼不對喔，再試一次 🙈" : "讀取失敗，請確認網路或 Apps Script 設定 😢";
      loginError.hidden = false;
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = "進入 ✨";
    }
  });

  $("#logoutBtn").addEventListener("click", () => {
    storage.clear();
    state.rows = [];
    board.hidden = true;
    topActions.hidden = true;
    login.hidden = false;
    keyInput.value = "";
    keyInput.focus();
  });

  $("#refreshBtn").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try { await load(storage.get(), { silent: true }); }
    catch (_) { board.classList.remove("loading"); alert("重新整理失敗，請稍後再試"); }
    finally { btn.disabled = false; }
  });

  /* ---------- 篩選 ---------- */
  $("#range").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-days]");
    if (!b) return;
    $("#range").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
    state.days = Number(b.dataset.days);
    state.shown = PAGE;
    render();
  });

  let searchTimer;
  $("#search").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.q = e.target.value.trim();
      state.shown = PAGE;
      render();
    }, 150);
  });

  moreBtn.addEventListener("click", () => {
    state.shown += PAGE;
    renderList();
  });

  function rangeStart() {
    if (!state.days) {
      const oldest = state.rows[state.rows.length - 1];
      return oldest ? startOfDay(oldest.date) : startOfDay(new Date());
    }
    const d = startOfDay(new Date());
    d.setDate(d.getDate() - (state.days - 1));
    return d;
  }

  function applyFilter() {
    const from = rangeStart();
    const q = state.q.toLowerCase();
    state.filtered = state.rows.filter(
      (r) => r.date >= from && (!q || r.say.toLowerCase().includes(q) || r.better.toLowerCase().includes(q))
    );
    return from;
  }

  /* ---------- 繪製 ---------- */
  function render() {
    const from = applyFilter();
    renderTiles(from);
    renderChart(from);
    renderList();
  }

  function renderTiles(from) {
    const rows = state.filtered;
    const n = rows.length;
    const withBetter = rows.filter((r) => r.better.trim()).length;
    const spanDays = Math.max(1, Math.round((startOfDay(new Date()) - from) / DAY) + 1);

    $("#kTotal").textContent = n;
    $("#kTotalSub").textContent = state.days ? `近 ${state.days} 天` : `累計至今`;
    $("#kBetter").textContent = n ? `${Math.round((withBetter / n) * 100)}%` : "–";
    $("#kBetterSub").textContent = `${withBetter} 則有寫建議`;
    $("#kWeekly").textContent = n ? (n / (spanDays / 7)).toFixed(1) : "0";
    const latest = state.rows[0];
    $("#kLatest").textContent = latest ? relTime(latest.date) : "–";
    $("#kLatestSub").textContent = latest ? fmtFull(latest.date) : "還沒有回饋";
  }

  function buckets(from) {
    const weekly = !state.days || state.days > 30;
    const today = startOfDay(new Date());
    const out = [];
    let cur = weekly ? startOfWeek(from) : new Date(from);
    while (cur <= today) {
      const next = new Date(cur);
      next.setDate(next.getDate() + (weekly ? 7 : 1));
      out.push({ start: new Date(cur), end: next, count: 0 });
      cur = next;
    }
    for (const r of state.filtered) {
      const b = out.find((x) => r.date >= x.start && r.date < x.end);
      if (b) b.count++;
    }
    return { weekly, out };
  }

  const SVG = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}) => {
    const n = document.createElementNS(SVG, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };

  function niceMax(v) {
    if (v <= 4) return Math.max(1, v);
    const step = Math.pow(10, Math.floor(Math.log10(v)));
    for (const m of [1, 2, 2.5, 5, 10]) if (m * step >= v) return m * step;
    return v;
  }

  function renderChart(from) {
    const { weekly, out } = buckets(from);
    $("#chartTitle").textContent = weekly ? "每週回饋數" : "每日回饋數";
    chartEl.textContent = "";
    tip.hidden = true;

    const W = Math.max(280, chartEl.clientWidth || 600);
    const H = W < 500 ? 200 : 240;
    const m = { top: 22, right: 8, bottom: 28, left: 30 };
    const iw = W - m.left - m.right;
    const ih = H - m.top - m.bottom;
    const max = niceMax(Math.max(0, ...out.map((b) => b.count)));
    const ticks = max <= 4 ? max : 4;

    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": $("#chartTitle").textContent });

    for (let i = 0; i <= ticks; i++) {
      const v = (max / ticks) * i;
      const y = m.top + ih - (v / max) * ih;
      svg.appendChild(el("line", { class: "grid-line", x1: m.left, x2: W - m.right, y1: y, y2: y }));
      const t = el("text", { class: "axis-label", x: m.left - 8, y: y + 4, "text-anchor": "end" });
      t.textContent = Number.isInteger(v) ? v : v.toFixed(1);
      svg.appendChild(t);
    }

    const slot = iw / out.length;
    const gap = Math.max(2, Math.min(slot * 0.3, 12));
    const bw = Math.max(2, slot - gap);
    const labelEvery = Math.ceil(out.length / Math.max(1, Math.floor(iw / 48)));
    const peak = out.reduce((a, b) => (b.count > a.count ? b : a), out[0]);

    out.forEach((b, i) => {
      const x = m.left + i * slot + gap / 2;
      const h = (b.count / max) * ih;
      const y = m.top + ih - h;
      const label = weekly ? `${fmtMD(b.start)} 那週` : fmtMD(b.start);

      const hit = el("rect", { class: "hit", x: m.left + i * slot, y: m.top, width: slot, height: ih, tabindex: 0 });
      hit.setAttribute("aria-label", `${label}：${b.count} 則`);
      svg.appendChild(hit);

      if (b.count > 0) {
        const r = Math.min(4, bw / 2, h);
        const d = `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${y + h} Z`;
        svg.appendChild(el("path", { class: "bar", d }));
      } else {
        svg.appendChild(el("g", { class: "bar" }));
      }

      if (b === peak && b.count > 0) {
        const t = el("text", { class: "value-label", x: x + bw / 2, y: y - 6, "text-anchor": "middle" });
        t.textContent = b.count;
        svg.appendChild(t);
      }

      if (i % labelEvery === 0) {
        const t = el("text", { class: "axis-label", x: x + bw / 2, y: H - 8, "text-anchor": "middle" });
        t.textContent = fmtMD(b.start);
        svg.appendChild(t);
      }

      const show = () => {
        tip.textContent = "";
        const s = document.createElement("strong");
        s.textContent = `${b.count} 則`;
        const sp = document.createElement("span");
        sp.textContent = label;
        tip.append(s, sp);
        tip.hidden = false;
        const box = chartEl.getBoundingClientRect();
        const card = chartEl.parentElement.getBoundingClientRect();
        const scale = box.width / W;
        tip.style.left = `${box.left - card.left + (x + bw / 2) * scale}px`;
        tip.style.top = `${box.top - card.top + Math.min(y, m.top + ih) * scale - 8}px`;
      };
      const hide = () => { tip.hidden = true; };
      hit.addEventListener("pointerenter", show);
      hit.addEventListener("focus", show);
      hit.addEventListener("pointerleave", hide);
      hit.addEventListener("blur", hide);
    });

    svg.appendChild(el("line", { class: "grid-line", x1: m.left, x2: W - m.right, y1: m.top + ih, y2: m.top + ih, style: "stroke:#d9c4cf" }));
    chartEl.appendChild(svg);
  }

  // 安全地把關鍵字標亮（不使用 innerHTML）
  function highlight(parent, text) {
    const q = state.q;
    if (!q) { parent.textContent = text; return; }
    const lower = text.toLowerCase();
    const ql = q.toLowerCase();
    let i = 0;
    let at;
    while ((at = lower.indexOf(ql, i)) !== -1) {
      parent.append(text.slice(i, at));
      const mk = document.createElement("mark");
      mk.textContent = text.slice(at, at + q.length);
      parent.append(mk);
      i = at + q.length;
    }
    parent.append(text.slice(i));
  }

  function renderList() {
    const rows = state.filtered;
    listEl.textContent = "";
    $("#listCount").textContent = `${rows.length} 則`;
    $("#empty").hidden = rows.length > 0;

    rows.slice(0, state.shown).forEach((r) => {
      const li = document.createElement("li");
      li.className = "item";
      const t = document.createElement("time");
      t.dateTime = r.date.toISOString();
      t.textContent = `🕒 ${fmtFull(r.date)}`;

      const q1 = document.createElement("p");
      q1.className = "q";
      q1.textContent = "💭 我想說說";
      const a1 = document.createElement("p");
      highlight(a1, r.say);

      const q2 = document.createElement("p");
      q2.className = "q better";
      q2.textContent = "✨ 我覺得更好的方式";
      const a2 = document.createElement("p");
      if (r.better.trim()) highlight(a2, r.better);
      else { a2.className = "none"; a2.textContent = "（沒有填寫）"; }

      li.append(t, q1, a1, q2, a2);
      listEl.appendChild(li);
    });
    moreBtn.hidden = rows.length <= state.shown;
  }

  /* ---------- 匯出 ---------- */
  $("#exportBtn").addEventListener("click", () => {
    const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;
    const lines = [["時間", "我想說說", "我覺得更好的方式"].map(esc).join(",")];
    state.filtered.forEach((r) => lines.push([fmtFull(r.date), r.say, r.better].map(esc).join(",")));
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    const d = new Date();
    a.href = URL.createObjectURL(blob);
    a.download = `PGY回饋_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (!board.hidden) renderChart(rangeStart()); }, 120);
  });

  /* ---------- 示範資料 ---------- */
  function demoRows() {
    const says = [
      "值班室冷氣好像壞掉了，晚上很難睡 🥵",
      "內科輪訓時 teaching 時間常常被臨時取消",
      "希望交班單格式可以統一，每科都不一樣好混亂",
      "急診夜班連續太多天，身體有點撐不住",
      "老師都很願意教，覺得收穫很多！",
      "停車位好難找，常常因為找車位差點遲到",
      "EMR 系統有時候很卡，開單要等很久",
      "希望可以有更多手術室的實作機會",
    ];
    const betters = [
      "可以請工務幫忙檢查一下嗎",
      "如果真的要取消，希望可以提早通知或改期",
      "",
      "夜班可以排成最多連續 3 天",
      "",
      "早班時段能不能保留一些車位給 PGY",
      "",
      "每週固定一個時段讓 PGY 進 OR",
    ];
    const rows = [];
    let seed = 7;
    const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 64; i++) {
      const k = Math.floor(rand() * says.length);
      const ago = Math.floor(Math.pow(rand(), 1.6) * 120 * DAY);
      rows.push({ timestamp: new Date(Date.now() - ago).toISOString(), say: says[k], better: betters[k] });
    }
    return rows;
  }

  /* ---------- 啟動 ---------- */
  (async () => {
    const saved = storage.get();
    if (DEMO || saved) {
      try {
        await load(saved);
        showBoard();
        return;
      } catch (_) {
        storage.clear();
      }
    }
    keyInput.focus();
  })();
})();
