# YY你說，我來聽 💬

給 PGY 回饋問題的小網站，風格可愛逗趣。純靜態網頁（HTML / CSS / JS），可直接用 GitHub Pages 架設；回饋內容透過 Google Apps Script 寫進 Google 試算表。

## 功能

- 🙈 全程匿名，不收集任何身分資料
- 只有兩題：
  1. **我想說說**（必填）
  2. **我覺得更好的方式**（選填）
- 🐻 會說話的吉祥物（點牠會換台詞）、送出後撒彩帶 🎉
- 📱 手機友善，支援「減少動態效果」設定

## 檔案

| 檔案 | 說明 |
| --- | --- |
| `index.html` | 頁面 |
| `style.css` | 樣式 |
| `script.js` | 互動與送出 |
| `config.js` | 設定接收網址 `ENDPOINT` |
| `google-apps-script/Code.gs` | 貼到 Google Apps Script 的接收程式 |

## 設定步驟

### 1. 建立接收回饋的 Google 試算表

1. 新增一份 Google 試算表（例如命名為「PGY 回饋」）。
2. 選單 **擴充功能 → Apps Script**，把 `google-apps-script/Code.gs` 的內容整份貼上並儲存。
3. 右上角 **部署 → 新增部署作業**，類型選 **網頁應用程式**：
   - 執行身分：**我**
   - 存取權：**所有人**
4. 授權後複製「網頁應用程式網址」（`https://script.google.com/macros/s/.../exec`）。

### 2. 填入網址

打開 `config.js`，把網址貼進去：

```js
window.FEEDBACK_CONFIG = {
  ENDPOINT: "https://script.google.com/macros/s/xxxx/exec",
};
```

> `ENDPOINT` 留空時是**示範模式**：回饋只存在該瀏覽器的 localStorage，不會真的送出。

### 3. 用 GitHub Pages 上線

Repo 的 **Settings → Pages**，Source 選 `Deploy from a branch`，分支選 `main`、資料夾 `/ (root)`，存檔後幾分鐘就會有網址。

## 本機預覽

```bash
python3 -m http.server 8000
# 打開 http://localhost:8000
```
