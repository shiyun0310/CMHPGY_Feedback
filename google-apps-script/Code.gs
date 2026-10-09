/**
 * YY你說，我來聽 💬 — 回饋接收程式
 * 把網站送來的回饋寫進這份 Google 試算表的「回饋」工作表。
 */
const SHEET_NAME = "回饋";
const HEADERS = [
  ["timestamp", "時間"],
  ["anonymous", "匿名"],
  ["name", "名字"],
  ["contact", "聯絡方式"],
  ["year", "年級"],
  ["rotation", "輪訓科別"],
  ["category", "類別"],
  ["mood", "心情"],
  ["urgency", "緊急程度"],
  ["title", "標題"],
  ["content", "內容"],
  ["wish", "願望"],
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse(e.postData.contents);
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
