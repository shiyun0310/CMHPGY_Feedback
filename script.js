(() => {
  const ENDPOINT = (window.FEEDBACK_CONFIG && window.FEEDBACK_CONFIG.ENDPOINT) || "";

  const $ = (sel) => document.querySelector(sel);
  const form = $("#feedbackForm");
  const say_ = $("#say");
  const better = $("#better");
  const countSay = $("#countSay");
  const countBetter = $("#countBetter");
  const errorBox = $("#error");
  const sendBtn = $("#sendBtn");
  const done = $("#done");
  const mascot = $("#mascot");
  const speech = $("#speech");

  /* ---------- 吉祥物 ---------- */
  const lines = [
    "嗨～今天還好嗎？",
    "有話直說沒關係 🫶",
    "我口風很緊的 🤐",
    "值班辛苦了 🌙",
    "記得喝水喔 💧",
    "戳我幹嘛啦 >///<",
    "你超棒的 ⭐",
    "抱抱 🤗",
  ];
  let lineIdx = 0;
  const say = (text) => { speech.textContent = text; };

  mascot.addEventListener("click", () => {
    lineIdx = (lineIdx + 1) % lines.length;
    say(lines[lineIdx]);
    mascot.classList.remove("wiggle");
    void mascot.offsetWidth;
    mascot.classList.add("wiggle", "happy");
    setTimeout(() => mascot.classList.remove("happy"), 900);
  });

  /* ---------- 表單互動 ---------- */
  const bindCounter = (el, out) =>
    el.addEventListener("input", () => { out.textContent = el.value.length; });
  bindCounter(say_, countSay);
  bindCounter(better, countBetter);

  say_.addEventListener("focus", () => say("我在聽，慢慢說 👂"));
  better.addEventListener("focus", () => say("好想聽聽你的點子 💡"));

  /* ---------- 送出 ---------- */
  const showError = (msg) => {
    errorBox.textContent = msg;
    errorBox.hidden = false;
  };

  const collect = () => ({
    timestamp: new Date().toISOString(),
    say: say_.value.trim(),
    better: better.value.trim(),
  });

  const send = async (data) => {
    if (!ENDPOINT) {
      // 示範模式：存在本機
      try {
        const list = JSON.parse(localStorage.getItem("pgy-feedback-demo") || "[]");
        list.push(data);
        localStorage.setItem("pgy-feedback-demo", JSON.stringify(list));
      } catch (_) { /* 無法儲存也沒關係 */ }
      await new Promise((r) => setTimeout(r, 600));
      return { demo: true };
    }
    // text/plain 為簡單請求，不會觸發 CORS preflight（Google Apps Script 適用）
    await fetch(ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(data),
    });
    return { demo: false };
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.hidden = true;

    const data = collect();
    if (data.say.length < 5) {
      say_.classList.remove("shake");
      void say_.offsetWidth;
      say_.classList.add("shake");
      say_.focus();
      say("多說一點點嘛 🥺");
      showError("「我想說說」至少寫 5 個字喔～ 🥺");
      return;
    }

    sendBtn.disabled = true;
    sendBtn.querySelector(".send-text").textContent = "咻咻咻～傳送中 💨";

    try {
      const result = await send(data);
      form.hidden = true;
      done.hidden = false;
      if (result.demo) {
        $("#doneMsg").innerHTML +=
          '<br /><small>（目前是示範模式，訊息只存在這台裝置；管理者設定好後就會真的送出囉）</small>';
      }
      say("收到收到！你很勇敢 💖");
      confetti();
      done.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (err) {
      showError("嗚嗚，網路好像怪怪的，等一下再試一次好嗎？ 😢");
    } finally {
      sendBtn.disabled = false;
      sendBtn.querySelector(".send-text").textContent = "送出去 🚀";
    }
  });

  $("#againBtn").addEventListener("click", () => {
    form.reset();
    countSay.textContent = "0";
    countBetter.textContent = "0";
    $("#doneMsg").innerHTML =
      "我們會好好看、認真想辦法。<br />辛苦了，記得喝水、吃飯、偷偷休息一下！";
    done.hidden = true;
    form.hidden = false;
    say("還有什麼想說的呢？ 👂");
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* ---------- 彩帶 ---------- */
  function confetti() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = $("#confetti");
    const bits = ["💖", "✨", "⭐", "🎉", "💬", "🌸", "🍬"];
    for (let i = 0; i < 40; i++) {
      const el = document.createElement("i");
      el.textContent = bits[Math.floor(Math.random() * bits.length)];
      el.style.left = Math.random() * 100 + "vw";
      el.style.animationDuration = 2 + Math.random() * 2.5 + "s";
      el.style.animationDelay = Math.random() * 0.6 + "s";
      el.style.fontSize = 16 + Math.random() * 18 + "px";
      box.appendChild(el);
      setTimeout(() => el.remove(), 5500);
    }
  }
})();
