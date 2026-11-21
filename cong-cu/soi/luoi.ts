// Soi lưới + vật liệu của nhân vật trên sân khấu (gỡ lỗi GĐ 1)
import { moTrinhDuyet, moSanKhau } from '../../src/trinh-duyet/mo-chrome.js';
const goc = 'http://localhost:8790';
const { browser, ctx } = await moTrinhDuyet(goc);
const p = await ctx.newPage();
await moSanKhau(p, goc, { nen: 'phong' });
console.log(JSON.stringify(await p.evaluate(() => (window as any).__botSanKhau.luoi()), null, 1));
await ctx.close(); await browser.close();
