// CLI bot-front-cam. GĐ 0: `bot kha-thi` – đưa nhân vật tạm vào app, ghi chữ thấy trên màn, chụp ảnh định kỳ.
import fs from 'node:fs';
import path from 'node:path';
import { moPhien, docChu, moTrinhDuyet, moSanKhau } from './trinh-duyet/mo-chrome.js';

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
  const p = await moPhien({ url: o.url ?? URL_MAC_DINH, nv: o.nv, nen: (o.nen as any) ?? 'chup', dem: o.dem ? +o.dem : undefined, quayVideo: o.video === 'true' ? ra : undefined, phucVu: o['phuc-vu'] });
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
    // số khung tab app nhận + giải mã (thống kê WebRTC inbound-rtp) và nhịp vẽ của chính app
    // (chuỗi, không phải hàm: tsx chèn helper __name vào hàm có tên → lỗi trong trang)
    const cam = await p.app.evaluate(`(async () => {
      const c = window.__botCamera; if (!c) return { coCamera: false };
      const s = c.track.getSettings();
      let f = 0; const t0 = performance.now(); await new Promise(r => { (function b(){ f++; if (performance.now() - t0 < 2000) requestAnimationFrame(b); else r(); })(); });
      let vao = null; (await c.pc.getStats()).forEach(r => { if (r.type === 'inbound-rtp' && r.kind === 'video') vao = { khungGiay: r.framesPerSecond, giaiMa: r.framesDecoded, rot: r.framesDropped }; });
      return { coCamera: true, trangThai: c.track.readyState, rong: s.width, cao: s.height, appVeGiay: +(f / 2).toFixed(1), nhan: vao };
    })()`);
    log('SÂN KHẤU ' + JSON.stringify(tt));
    log('PHÁT ' + JSON.stringify(await p.sanKhau.evaluate(() => (window as any).__botSanKhau.thongKePhat())));
    log('CAMERA APP ' + JSON.stringify(cam));
  } catch (e: any){ log('LỖI: ' + e.message); }
  finally {
    dung = true; clearInterval(chup); await theoDoi;
    await p.app.screenshot({ path: path.join(ra, 'app-cuoi.png') }).catch(() => {});
    await p.dong();
    log('xong → ' + ra);
  }
}

// Soi nhân vật: chỉ mở sân khấu, chụp từng tư thế + chụp cận mặt (cười, chớp mắt). Không cần app.
async function thuNhanVat(o: Record<string, string>){
  const ra = path.resolve(o.ra ?? `ket-qua/nhan-vat-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`);
  fs.mkdirSync(ra, { recursive: true });
  const goc = 'http://localhost:8790';
  const { browser, ctx } = await moTrinhDuyet(goc);
  // sân khấu chỉ cần origin – không gọi app; trả trang trống cho mọi đường khác
  await ctx.route(`${goc}/`, r => r.fulfill({ status: 200, body: '' }));
  const p = await ctx.newPage();
  await p.setViewportSize({ width: 660, height: 540 });
  try {
    await moSanKhau(p, goc, { nv: o.nv, nen: o.nen ?? 'phong', dem: o.dem ? +o.dem : 5, hauKy: o.hauky !== '0', cuoi: o.cuoi !== undefined ? +o.cuoi : undefined });
    const tt = await p.evaluate(() => (window as any).__botSanKhau.trangThai());
    console.log('sân khấu:', JSON.stringify(tt));
    const cv = p.locator('#cv');
    for (const h of (o.hanh ?? 'dung,vay,gioTay,dangTay').split(',')){
      await p.evaluate(h => (window as any).__botSanKhau.lam(h), h);
      await p.waitForTimeout(+(o.cho ?? 1200));
      await cv.screenshot({ path: path.join(ra, `${h}.png`) });
      console.log('chụp', h);
    }
    if (o.mat !== '0'){
      await p.evaluate(() => (window as any).__botSanKhau.lam('dung'));
      const dau = await p.evaluate(() => (window as any).__botSanKhau.viTriXuong('head'));
      if (dau){
        const [x, y, z] = dau;
        await p.evaluate(([x, y, z, fov]) => (window as any).__botSanKhau.soiCan({ tu: [x, y + 0.04, z + 0.9], nhin: [x, y + 0.04, z], fov }), [x, y, z, +(o.fovmat ?? 18)]);
        for (let i = 0; i < 10; i++){ await p.waitForTimeout(450); await cv.screenshot({ path: path.join(ra, `mat-${i}.png`) }); }
        await p.evaluate(() => (window as any).__botSanKhau.soiCan(null));
      }
    }
  } finally { await ctx.close(); await browser.close(); }
  console.log('xong →', ra);
}

const { lenh, o } = docThamSo(process.argv.slice(2));
if (lenh === 'kha-thi') await khaThi(o);
else if (lenh === 'thu-nhan-vat') await thuNhanVat(o);
else console.log(`bot-front-cam
  bot kha-thi [--url ${URL_MAC_DINH}] [--nv be-trai-11|tam/Soldier] [--nen chup|truc-tiep|phong] [--dem 5]
              [--buoc "bam:Bắt đầu|cho:Đứng vào|lam:vay|nghi:3"] [--giay 30] [--chup 5] [--video] [--ra thư-mục]
              [--phuc-vu <siroby-app/dist/app>]  (tự phục vụ app nếu URL localhost chưa chạy)
  bot thu-nhan-vat [--nv be-trai-11] [--nen phong|chup|truc-tiep] [--hanh dung,vay,gioTay,dangTay] [--mat 0] [--hauky 0] [--ra thư-mục]`);
