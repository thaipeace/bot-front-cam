// In vị trí các xương miệng / má (toạ độ thế giới, mm so với xương 'head') – để chọn xương khoé miệng
import { moTrinhDuyet, moSanKhau } from '../../src/trinh-duyet/mo-chrome.js';
const goc = 'http://localhost:8790';
const { browser, ctx } = await moTrinhDuyet(goc);
const p = await ctx.newPage();
await moSanKhau(p, goc, { nen: 'phong', cuoi: 0 });
const ten = ['head','jaw','oris01','oris02','oris03L','oris03R','oris04L','oris04R','oris05','oris06','oris06L','oris06R','oris07L','oris07R','risorius02L','risorius02R','risorius03L','risorius03R','levator05L','levator06L','orbicularis03L','orbicularis04L'];
const r = await p.evaluate(ds => ds.map(n => [n, (window as any).__botSanKhau.viTriXuong(n)]), ten);
const h = r[0][1];
for (const [n, v] of r) if (v) console.log(n.padEnd(16), v.map((x: number, i: number) => ((x - h[i]) * 1000).toFixed(0).padStart(5)).join(' '));
await ctx.close(); await browser.close();
