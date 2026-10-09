(() => {
  const ENDPOINT = (window.FEEDBACK_CONFIG && window.FEEDBACK_CONFIG.ENDPOINT) || "";
  const DEMO = new URLSearchParams(location.search).has("demo");
  const PAGE = 20;
  const DAY = 86400000;

  const $ = (sel) => document.querySelector(sel);
  const status = $("#status");
  const retryBtn = $("#retryBtn");
  const board = $("#board");
  const topActions = $("#topActions");
  const listEl = $("#list");
  const moreBtn = $("#moreBtn");

  const state = { rows: [], days: 30, q: "", shown: PAGE, filtered: [] };

  /* ---------- 小工具 ---------- */
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
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
  async function fetchRows() {
    if (DEMO || !ENDPOINT) return demoRows();
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "list" }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "error");
    return data.rows;
  }

  function normalize(rows) {
    return rows
      .map((r) => ({ date: new Date(r.timestamp), say: String(r.say || ""), better: String(r.better || "") }))
      .filter((r) => !isNaN(r.date))
      .sort((a, b) => b.date - a.date);
  }

  async function load({ silent } = {}) {
    if (silent) board.classList.add("loading");
    const rows = await fetchRows();
    state.rows = normalize(rows);
    board.classList.remove("loading");
    render();
  }

  /* ---------- 顯示 ---------- */
  function showBoard() {
    status.hidden = true;
    board.hidden = false;
    topActions.hidden = false;
    $("#demoNote").hidden = !(DEMO || !ENDPOINT);
  }

  async function start() {
    status.hidden = false;
    status.classList.remove("failed");
    $("#statusTitle").textContent = "資料讀取中…";
    $("#statusMsg").textContent = "兔子正在努力搬資料，請稍等一下 🥕";
    retryBtn.hidden = true;
    try {
      await load();
      showBoard();
    } catch (_) {
      status.classList.add("failed");
      $("#statusTitle").textContent = "讀取失敗了 😢";
      $("#statusMsg").textContent = "請確認網路，或 Apps Script 是否已重新部署。";
      retryBtn.hidden = false;
    }
  }

  retryBtn.addEventListener("click", start);

  $("#refreshBtn").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try { await load({ silent: true }); }
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
    applyFilter();
    renderTiles();
    renderList();
  }

  function renderTiles() {
    $("#kTotal").textContent = state.filtered.length;
    $("#kTotalSub").textContent = state.days ? `近 ${state.days} 天` : `累計至今`;
    const latest = state.rows[0];
    $("#kLatest").textContent = latest ? relTime(latest.date) : "–";
    $("#kLatestSub").textContent = latest ? fmtFull(latest.date) : "還沒有回饋";
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
  start();
})();
