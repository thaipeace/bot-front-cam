// Dò lỗi: vị trí (m) các xương tay / chân / thân của bé trai ở tư thế nghỉ – kiểm tỉ lệ đoạn chi (bài sàn dùng tỉ lệ thật của nhân vật).
import { moTrinhDuyet, moSanKhau } from '../../src/trinh-duyet/mo-chrome.js';
const goc = 'http://localhost:8790';
const { browser, ctx } = await moTrinhDuyet(goc);
await ctx.route(`${goc}/`, r => r.fulfill({ status: 200, body: '' }));
const p = await ctx.newPage();
try {
  await moSanKhau(p, goc, { nen: 'phong', dem: 1 });
  const ten = ['clavicleL', 'shoulder01L', 'upperarm01L', 'upperarm02L', 'lowerarm01L', 'lowerarm02L', 'wristL', 'finger3-1L', 'upperleg01L', 'lowerleg01L', 'footL', 'head', 'neck01', 'spine01'];
  for (const t of ten) console.log(t.padEnd(14), JSON.stringify(await p.evaluate(t => (window as any).__botSanKhau.viTriXuong(t), t)));
} finally { await ctx.close(); await browser.close(); }
