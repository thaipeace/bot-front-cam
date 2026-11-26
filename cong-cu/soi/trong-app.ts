// Dò lỗi: chạy một biểu thức JS (từ tệp) trong trang app đã nạp xong HT_DT / MAU3D, in kết quả (chuỗi / JSON).
//   npx tsx cong-cu/soi/trong-app.ts <bieu-thuc.js> [--phuc-vu <dist/app>] [--url …]
import fs from 'node:fs';
import { chromium } from 'playwright';
import { damBaoMayChuApp } from '../../src/trinh-duyet/may-chu-app.js';
const arg = (k: string, md?: string) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : md; };
const URL_APP = arg('url', 'http://localhost:8790/vui/index.html?tro=ht003-khoi-dong-khop')!;
const tat = await damBaoMayChuApp(URL_APP, arg('phuc-vu'));
const b = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const p = await b.newPage(); await p.goto(URL_APP, { timeout: 90_000 });
  await p.waitForFunction('typeof MAU3D !== "undefined" && typeof HT_DT !== "undefined"', null, { timeout: 90_000 });
  const r = await p.evaluate(fs.readFileSync(process.argv[2], 'utf8'));
  console.log(typeof r === 'string' ? r : JSON.stringify(r, null, 1));
} finally { await b.close(); tat?.(); }
