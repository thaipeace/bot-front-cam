// CLI bot-front-cam. GĐ 0: `bot kha-thi` – đưa nhân vật tạm vào app, ghi chữ thấy trên màn, chụp ảnh định kỳ.
import fs from 'node:fs';
import path from 'node:path';
import { moPhien, docChu } from './trinh-duyet/mo-chrome.js';

const URL_MAC_DINH = 'http://localhost:8790/vui/index.html?tro=ht003-khoi-dong-khop';

function docThamSo(argv: string[]){
  const [lenh = 'giup', ...r] = argv;
  const o: Record<string, string> = {};
  for (let i = 0; i < r.length; i++){
    const a = r[i];
    if (a.startsWith('--')){ const k = a.slice(2); const v = r[i + 1] && !r[i + 1].startsWith('--') ? r[++i] : 'true'; o[k] = v; }
  }
  return { lenh, o };
}

// bước dạng "bam:Bắt đầu" | "cho:Đứng vào khung" | "lam:vay" | "nghi:3"
async function chayBuoc(buoc: string, p: Awaited<ReturnType<typeof moPhien>>, log: (s: string) => void){
  const i = buoc.indexOf(':'); const loai = buoc.slice(0, i), gt = buoc.slice(i + 1);
  if (loai === 'bam'){ await p.app.getByText(gt, { exact: false }).first().click({ timeout: 30_000 }); log(`BẤM "${gt}"`); }
  else if (loai === 'cho'){
    const het = Date.now() + 60_000;
    for (;;){
      const c = await docChu(p.app);
      if ([...c.canvas, ...c.dom].some(s => s.toLowerCase().includes(gt.toLowerCase()))){ log(`THẤY "${gt}"`); break; }
      if (Date.now() > het) throw new Error(`hết giờ chờ "${gt}"`);
      await new Promise(r => setTimeout(r, 100));
    }
  }
  else if (loai === 'lam'){ await p.sanKhau.evaluate(h => (window as any).__botSanKhau.lam(h), gt); log(`LÀM ${gt}`); }
  else if (loai === 'nghi'){ await new Promise(r => setTimeout(r, +gt * 1000)); }
  else throw new Error('bước lạ: ' + buoc);
}

async function khaThi(o: Record<string, string>){
  const ra = path.resolve(o.ra ?? `ket-qua/kha-thi-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`);
  fs.mkdirSync(ra, { recursive: true });
  const t0 = Date.now();
  const nhatKy = path.join(ra, 'nhat-ky.txt');
  const log = (s: string) => { const d = `${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s  ${s}`; console.log(d); fs.appendFileSync(nhatKy, d + '\n'); };
  const p = await moPhien({ url: o.url ?? URL_MAC_DINH, nv: o.nv, nen: (o.nen as any) ?? 'phong', quayVideo: o.video === 'true' ? ra : undefined, phucVu: o['phuc-vu'] });
  p.app.on('pageerror', e => log('LỖI TRANG APP: ' + e.message));
  p.sanKhau.on('pageerror', e => log('LỖI SÂN KHẤU: ' + e.message));
  p.sanKhau.on('console', m => { if (m.type() === 'error') log('SÂN KHẤU console: ' + m.text()); });
  log('đã mở app ' + p.app.url());
  await p.sanKhau.screenshot({ path: path.join(ra, 'san-khau.png') });

  // theo dõi chữ mới xuất hiện
  let truoc = new Set<string>();
  let dung = false;
  const theoDoi = (async () => {
    while (!dung){
      try {
        const c = await docChu(p.app);
        const bay = new Set([...c.canvas.map(s => '[cv] ' + s), ...c.dom.map(s => '[dom] ' + s)]);
        const moi = [...bay].filter(s => !truoc.has(s));
        if (moi.length) log('CHỮ MỚI: ' + moi.slice(0, 12).join(' | ') + (moi.length > 12 ? ` (+${moi.length - 12})` : ''));
        truoc = bay;
      } catch {}
      await new Promise(r => setTimeout(r, 250));
    }
  })();
  const chup = setInterval(() => { p.app.screenshot({ path: path.join(ra, `app-${String(Math.round((Date.now() - t0) / 1000)).padStart(4, '0')}s.png`) }).catch(() => {}); }, +(o.chup ?? 5) * 1000);

  try {
    for (const b of (o.buoc ?? '').split('|').filter(Boolean)) await chayBuoc(b, p, log);
    await new Promise(r => setTimeout(r, +(o.giay ?? 30) * 1000));
    const tt = await p.sanKhau.evaluate(() => (window as any).__botSanKhau.trangThai());
    const cam = await p.app.evaluate(() => { const c = (window as any).__botCamera; return c ? { coCamera: true, trangThai: c.track.readyState, ...c.track.getSettings() } : { coCamera: false }; });
    log('SÂN KHẤU ' + JSON.stringify(tt));
    log('CAMERA APP ' + JSON.stringify(cam));
  } catch (e: any){ log('LỖI: ' + e.message); }
  finally {
    dung = true; clearInterval(chup); await theoDoi;
    await p.app.screenshot({ path: path.join(ra, 'app-cuoi.png') }).catch(() => {});
    await p.dong();
    log('xong → ' + ra);
  }
}

const { lenh, o } = docThamSo(process.argv.slice(2));
if (lenh === 'kha-thi') await khaThi(o);
else console.log(`bot-front-cam
  bot kha-thi [--url ${URL_MAC_DINH}] [--nv Soldier|Michelle] [--nen phong|webcam]
              [--buoc "bam:Bắt đầu|cho:Đứng vào|lam:vay|nghi:3"] [--giay 30] [--chup 5] [--video] [--ra thư-mục]
              [--phuc-vu <siroby-app/dist/app>]  (tự phục vụ app nếu URL localhost chưa chạy)`);
