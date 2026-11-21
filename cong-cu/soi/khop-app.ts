// Dò lỗi: cho bé trai làm một động tác rồi đọc điểm khớp app nhận được (POSE.lm – 33 điểm kiểu MediaPipe).
//   npx tsx cong-cu/soi/khop-app.ts <động tác> [giây=8] [kiểu-sai]
// In: tai (7/8), vai (11/12), hông (23/24), cổ chân (27/28), gót (29/30), mũi chân (31/32) – y, độ tin cậy.
import { moPhien } from '../../src/trinh-duyet/mo-chrome.js';
const [dt = 'xoayCo', giay = '8', kieuSai, anLuoi, sang, cach] = process.argv.slice(2);
const p = await moPhien({ url: 'http://localhost:8790/vui/index.html?tro=ht003-khoi-dong-khop', nen: 'phong' });
await p.app.getByText('Tôi là bố/mẹ').click(); await p.app.locator('#nutChoi').click();
await p.app.waitForFunction(`typeof POSE !== 'undefined' && POSE.lm && POSE.lm.length === 33`, null, { timeout: 60000 });
if (cach) await p.sanKhau.evaluate(`window.__botSanKhau.datCach(${+cach})`);
if (sang) await p.sanKhau.evaluate(`window.__botSanKhau.datSang(${+sang})`);
if (anLuoi) await p.sanKhau.evaluate(t => (window as any).__botSanKhau.anLuoi(t, false), anLuoi);
await p.app.waitForTimeout(5000);
await p.sanKhau.evaluate(a => (window as any).__botSanKhau.lamDongTac(a), { dongTac: dt, kieuSai });
const f = (n: number) => n.toFixed(3);
for (let i = 0; i < +giay * 5; i++){
  const r: any = await p.app.evaluate(`(() => { const L = POSE.lm; const g = i => [L[i].x, L[i].y, L[i].v ?? L[i].visibility ?? 0]; return { tay: [[g(11), g(13), g(15)], [g(12), g(14), g(16)]], tai: [g(7), g(8)], vai: [g(11), g(12)], hong: [g(23), g(24)], co: [g(27), g(28)], got: [g(29), g(30)], mui: [g(31), g(32)] }; })()`);
  const A = 640 / 480, S = Math.hypot((r.vai[0][0] - r.vai[1][0]) * A, r.vai[0][1] - r.vai[1][1]);   // như app: x × tỉ lệ khung
  const dd = (a: number[], b: number[]) => Math.hypot((a[0] - b[0]) * A, a[1] - b[1]);
  const thang = r.tay.map((t: number[][]) => dd(t[0], t[2]) / (dd(t[0], t[1]) + dd(t[1], t[2])));
  const hC = r.tay.map((t: number[][]) => (t[0][1] - t[2][1]) / S);   // cổ tay trên vai (× vai, + = trên)
  console.log(`${(i / 5).toFixed(1).padStart(5)}s tay thẳng ${f(thang[0])},${f(thang[1])} cổ tay cao ${f(hC[0])},${f(hC[1])} |`);
  console.log(`${(i / 5).toFixed(1).padStart(5)}s tai lệch/S ${f((r.tai[0][1] - r.tai[1][1]) / S)} (tin ${f(r.tai[0][2])},${f(r.tai[1][2])})  vai nghiêng ${f(Math.atan2(r.vai[1][1] - r.vai[0][1], r.vai[1][0] - r.vai[0][0]) * 57.3)}°  ` +
    `cổ chân y ${f(r.co[0][1])},${f(r.co[1][1])} gót ${f(r.got[0][1])},${f(r.got[1][1])} mũi ${f(r.mui[0][1])},${f(r.mui[1][1])} (tin ${f(r.got[0][2])},${f(r.mui[0][2])})`);
  await p.app.waitForTimeout(200);
}
await p.dong();
