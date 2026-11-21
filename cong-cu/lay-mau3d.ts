// Trích dữ liệu động tác chuẩn từ bản dựng siroby-app → src/dong-tac/mau/ht003.json
//   - MAU3D[mẫu]: khung hình chính đã ghép dáng đứng (mauKhung), câu nhắc, số lần lặp khi làm mẫu
//   - HT_DT[động tác]: tên, mẫu, nhịp (giây / lần), moiLan, kiểu (lay / giu), giây giữ
//   - MAU_DUNG (dáng đứng), MAU_KT, MG (tỉ lệ người giả) – để tái dựng mauKhop bên bot
// Chạy lại khi app đổi mẫu:  npx tsx cong-cu/lay-mau3d.ts [--phuc-vu <dist/app>] [--dong-tac a,b,c] [--ra tệp.json]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { damBaoMayChuApp } from '../src/trinh-duyet/may-chu-app.js';

const arg = (k: string, md?: string) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : md; };
const URL_APP = 'http://localhost:8790/vui/index.html?tro=ht003-khoi-dong-khop';
const DONG_TAC = (arg('dong-tac') ?? 'xoayCo,xoayVai,xoayLung,nghiengLuon,xoayHong,nhonGot,xoayTay,ngoiXomSau').split(',');
const RA = path.resolve(arg('ra') ?? 'src/dong-tac/mau/ht003.json');

const tat = await damBaoMayChuApp(URL_APP, arg('phuc-vu'));
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage();
await p.goto(URL_APP, { timeout: 90_000 });
await p.waitForFunction(() => typeof (window as any).MAU3D !== 'undefined' || typeof eval('typeof MAU3D') === 'string', null, { timeout: 90_000 });
const du = await p.evaluate(`(() => {
  const ds = ${JSON.stringify(DONG_TAC)};
  const dongTac = {}, mau = {};
  for (const id of ds){
    const d = HT_DT[id]; if (!d) throw new Error('HT_DT thiếu ' + id);
    dongTac[id] = { ten: d.ten, mau: d.mau, kieu: d.kieu, lay: d.lay, nhip: d.nhip, moiLan: d.moiLan || 1, giay: d.giay, giu: d.giu, doiBen: d.doiBen };
    const m = MAU3D[d.mau]; if (!m) throw new Error('MAU3D thiếu ' + d.mau);
    if (!mau[d.mau]) mau[d.mau] = { ten: m.ten, ma: m.ma, lap: m.lap || 1, k: mauKhung(m, MAU_DUNG), nhac: m.nhac, doDai: mauDoDai(d.mau) };
  }
  return { nguon: 'siroby-app ' + (window.PHIEN_BAN || ''), MAU_DUNG, MAU_KT, MG, dongTac, mau };
})()`);
fs.mkdirSync(path.dirname(RA), { recursive: true });
fs.writeFileSync(RA, JSON.stringify({ ...(du as any), trich: new Date().toISOString().slice(0, 10) }, null, 1));
await b.close(); tat?.();
const d = du as any;
for (const [id, x] of Object.entries<any>(d.dongTac)){ const m = d.mau[x.mau]; console.log(id.padEnd(12), x.kieu, 'nhịp', x.nhip, '× moiLan', x.moiLan, '| mẫu', x.mau, m.k.length, 'khung', m.doDai.toFixed(2) + 's', 'lặp', m.lap); }
console.log('→', RA);
