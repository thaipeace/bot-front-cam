// Thử bộ tìm người của sân khấu trên ảnh: npx tsx cong-cu/soi/tim-nguoi.ts <ảnh.png> ...
import fs from 'node:fs';
import { moTrinhDuyet } from '../../src/trinh-duyet/mo-chrome.js';
const goc = 'http://localhost:8790';
const { browser, ctx } = await moTrinhDuyet(goc);
await ctx.route(`${goc}/thu`, r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><script type="module">import { timNguoi } from "/__bot/san-khau/tim-nguoi.js"; window.timNguoi = timNguoi; window.san = true;</script>' }));
const p = await ctx.newPage();
await p.goto(`${goc}/thu`); await p.waitForFunction(() => (window as any).san);
for (const f of process.argv.slice(2)){
  const url = 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
  const kq = await p.evaluate(async url => { const im = new Image(); im.src = url; await im.decode(); return (window as any).timNguoi(im); }, url);
  console.log(f, '→', kq.length ? kq.map((k: any) => k.diem).join(', ') : 'không có người');
}
await ctx.close(); await browser.close();
