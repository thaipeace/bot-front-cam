// Đo góc nghiêng đầu thật trên sân khấu (đường nối hai thái dương so với phương ngang) khi làm một động tác
import { moTrinhDuyet, moSanKhau } from '../../src/trinh-duyet/mo-chrome.js';
const [dt = 'xoayCo'] = process.argv.slice(2);
const goc = 'http://localhost:8790';
const { browser, ctx } = await moTrinhDuyet(goc);
const p = await ctx.newPage();
await moSanKhau(p, goc, { nen: 'phong' });
await p.evaluate(`window.__botSanKhau.lamDongTac({ dongTac: '${dt}' })`);
for (let i = 0; i < 18; i++){
  const r: any = await p.evaluate(`(() => { const S = window.__botSanKhau; return { a: S.viTriXuong('temporalis01L'), b: S.viTriXuong('temporalis01R'), va: S.viTriXuong('upperarm01L'), vb: S.viTriXuong('upperarm01R'), dt: S.dongTac() }; })()`);
  const g = Math.atan2(r.a[1] - r.b[1], r.a[0] - r.b[0]) * 57.3, gv = Math.atan2(r.va[1] - r.vb[1], r.va[0] - r.vb[0]) * 57.3;
  console.log(`${(i * 0.2).toFixed(1)}s đầu nghiêng ${g.toFixed(1)}° · vai ${gv.toFixed(1)}° · ${r.dt.giay}s`);
  await p.waitForTimeout(200);
}
await ctx.close(); await browser.close();
