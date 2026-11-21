// Đo tỉ lệ cơ thể bé trai (m): bề ngang vai (khớp vai), bề ngang đầu (đỉnh lưới quanh tai), chiều dài thân
import { moTrinhDuyet, moSanKhau } from '../../src/trinh-duyet/mo-chrome.js';
const goc = 'http://localhost:8790';
const { browser, ctx } = await moTrinhDuyet(goc);
const p = await ctx.newPage();
await moSanKhau(p, goc, { nen: 'phong' });
const r: any = await p.evaluate(`(() => { const S = window.__botSanKhau; const v = n => S.viTriXuong(n);
  return { vaiT: v('upperarm01L'), vaiP: v('upperarm01R'), dau: v('head'), co: v('neck01'), tem: [v('temporalis01L'), v('temporalis01R')], tem2: [v('temporalis02L'), v('temporalis02R')] }; })()`);
const d = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
console.log('vai (khớp)', d(r.vaiT, r.vaiP).toFixed(3), '| thái dương 01', d(r.tem[0], r.tem[1]).toFixed(3), '| 02', d(r.tem2[0], r.tem2[1]).toFixed(3), '| cổ→đầu', d(r.co, r.dau).toFixed(3));
console.log(JSON.stringify(r));
await ctx.close(); await browser.close();
