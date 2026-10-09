/**
 * YY你說，我來聽 💬 — 回饋接收程式
 * 把網站送來的回饋寫進這份 Google 試算表的「回饋」工作表。
 */
const SHEET_NAME = "回饋";
const HEADERS = [
  ["timestamp", "時間"],
  ["say", "我想說說"],
  ["better", "我覺得更好的方式"],
];

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: "bad request" });
  }

  // 儀表板讀取回饋
  if (data.action === "list") return list_();

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_();
    const row = HEADERS.map(([key]) =>
      key === "timestamp" ? new Date() : safe_(data[key])
    );
    sheet.appendRow(row);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** 回傳所有回饋給 DDDDDDashboarddd。 */
function list_() {
  const values = getSheet_().getDataRange().getValues().slice(1);
  const rows = values
    .filter((r) => r[0] !== "")
    .map((r) => ({
      timestamp: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
      say: String(r[1] || ""),
      better: String(r[2] || ""),
    }));
  return json_({ ok: true, rows });
}

function doGet() {
  return json_({ ok: true, message: "YY在聽喔 💬" });
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS.map(([, label]) => label));
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#ffd3e2");
  }
  return sheet;
}

// 避免使用者輸入被試算表當成公式執行
function safe_(value) {
  const s = String(value || "").slice(0, 2000);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
