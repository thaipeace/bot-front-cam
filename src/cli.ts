// CLI bot-front-cam: run · kiem · dong-tac · thu-nhan-vat · kha-thi (dò lỗi: đưa bé trai vào app, ghi chữ thấy trên màn, chụp ảnh định kỳ).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const GOC_DU_AN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
import { moPhien, docChu, moTrinhDuyet, moSanKhau } from './trinh-duyet/mo-chrome.js';
import { docKichBan, LoiKichBan } from './chay/doc-kich-ban.js';
import { chayCase, type KetQuaCase } from './chay/thuc-thi.js';
import { docMau, docChuaHoTro, banDoTen } from './dong-tac/doc-mau.js';

const URL_MAC_DINH = 'http://localhost:8790/vui/index.html?tro=ht003-khoi-dong-khop';

// cờ không nhận giá trị (đứng trước tham số vị trí vẫn đúng: bot run --chi-tiet kich-ban/x.yaml)
const CO_BAT_TAT = new Set(['tu-dong', 'video', 'khong-video', 'chi-tiet', 'chua-ho-tro']);
function docThamSo(argv: string[]){
  const [lenh = 'giup', ...r] = argv;
  const o: Record<string, string> = {}, viTri: string[] = [];
  for (let i = 0; i < r.length; i++){
    const a = r[i];
    if (a.startsWith('--')){ const k = a.slice(2); o[k] = !CO_BAT_TAT.has(k) && r[i + 1] !== undefined && !r[i + 1].startsWith('--') ? r[++i] : 'true'; }
    else viTri.push(a);
  }
  return { lenh, o, viTri };
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
  const p = await moPhien({ url: o.url ?? URL_MAC_DINH, nv: o.nv, nen: (o.nen as any) ?? 'chup', dem: o.dem ? +o.dem : undefined, quayVideo: o.video === 'true' ? ra : undefined, phucVu: o['phuc-vu'], hat: o.hat ? +o.hat : undefined });
  p.app.on('pageerror', e => log('LỖI TRANG APP: ' + e.message));
  p.sanKhau.on('pageerror', e => log('LỖI SÂN KHẤU: ' + e.message));
  p.sanKhau.on('console', m => { if (m.type() === 'error') log('SÂN KHẤU console: ' + m.text()); });
  log('đã mở app ' + p.app.url());
  await p.sanKhau.screenshot({ path: path.join(ra, 'san-khau.png') });

  // theo dõi chữ mới xuất hiện
  let truoc = new Set<string>();
  let dung = false;
  const tuDong = o['tu-dong'] === 'true';
  const TEN_DT = banDoTen(docMau());
  let dtHien = '';
  // ép kiểu sai / biên độ cho động tác trong chế độ tự động: --sai xoayTay=vong_nho,xoayCo=nghieng_ca_vai · --bien-do nhonGot=0.5
  const capGT = (v?: string) => new Map((v ?? '').split(',').filter(Boolean).map(x => x.split('=') as [string, string]));
  const SAI = capGT(o.sai), BIEN_DO = new Map([...capGT(o['bien-do'])].map(([k, v]) => [k, +v]));
  const denKhi = o['den-khi']; let thayDich = false;
  const theoDoi = (async () => {
    while (!dung){
      try {
        const c = await docChu(p.app);
        const bay = new Set([...c.canvas.map(s => '[cv] ' + s), ...c.dom.map(s => '[dom] ' + s)]);
        const moi = [...bay].filter(s => !truoc.has(s));
        // TỰ ĐỘNG: thấy tên động tác app đang yêu cầu → bé trai đổi sang đúng động tác đó (làm đến khi app đổi)
        if (tuDong){
          const thay = c.canvas.map(s => TEN_DT.get(s)).filter(Boolean) as string[];
          const chon = thay.find(id => id !== dtHien) && thay.length === 1 ? thay[0] : null;
          if (chon && chon !== dtHien){
            dtHien = chon;
            const kq = await p.sanKhau.evaluate(a => (window as any).__botSanKhau.lamDongTac(a), { dongTac: chon, kieuSai: SAI.get(chon), bienDo: BIEN_DO.get(chon) });
            log(`TỰ ĐỘNG → ${chon} ${JSON.stringify(kq)}`);
          }
        }
        if (denKhi && [...c.canvas, ...c.dom].some(s => s.includes(denKhi))) thayDich = true;
        if (moi.length) log('CHỮ MỚI: ' + moi.slice(0, 12).join(' | ') + (moi.length > 12 ? ` (+${moi.length - 12})` : ''));
        truoc = bay;
      } catch {}
      await new Promise(r => setTimeout(r, 250));
    }
  })();
  // dò lỗi: in một biểu thức JS của app mỗi giây (vd. --soi-app "JSON.stringify(TT._.nhon)")
  const soi = o['soi-app'] ? setInterval(async () => { try { log('SOI ' + await p.app.evaluate(o['soi-app'])); } catch (e: any) { log('SOI lỗi ' + e.message); } }, 1000) : null;
  const chup = setInterval(() => { p.app.screenshot({ path: path.join(ra, `app-${String(Math.round((Date.now() - t0) / 1000)).padStart(4, '0')}s.png`) }).catch(() => {}); }, +(o.chup ?? 5) * 1000);

  try {
    for (const b of (o.buoc ?? '').split('|').filter(Boolean)) await chayBuoc(b, p, log);
    { const het = Date.now() + +(o.giay ?? 30) * 1000; while (Date.now() < het && !thayDich) await new Promise(r => setTimeout(r, 250)); if (thayDich) log(`THẤY "${denKhi}" – dừng`); }
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
    dung = true; clearInterval(chup); if (soi) clearInterval(soi); await theoDoi;
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
    // chụp liên tiếp từng động tác bài tập: --dong-tac xoayCo,xoayVai … (--kieu-sai, --so-anh, --cach giây)
    if (o['dong-tac']){
      const ds = o['dong-tac'] === 'het' ? await p.evaluate(() => (window as any).__botSanKhau.danhSachDongTac()) : o['dong-tac'].split(',');
      for (const id of ds){
        const tt = await p.evaluate(a => (window as any).__botSanKhau.lamDongTac(a), { dongTac: id, kieuSai: o['kieu-sai'], bienDo: o['bien-do'] ? +o['bien-do'] : undefined });
        console.log('động tác', JSON.stringify(tt));
        await p.waitForTimeout(400);
        for (let i = 0; i < +(o['so-anh'] ?? 8); i++){ await cv.screenshot({ path: path.join(ra, `${id}-${i}.png`) }); await p.waitForTimeout(+(o.cach ?? 0.4) * 1000); }
        await p.evaluate(() => (window as any).__botSanKhau.dungDongTac());
        await p.waitForTimeout(500);
      }
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

// bot run <tệp.yaml | thư mục> – chạy kịch bản; mỗi case một context Chrome mới
async function chay(duong: string | undefined, o: Record<string, string>){
  if (!duong) throw new Error('thiếu tệp / thư mục kịch bản: bot run kich-ban/ht003.yaml');
  const cases = docKichBan(duong).filter(c => !o.case || o.case.split(',').includes(c.ten));
  if (!cases.length) throw new Error('không có case nào để chạy' + (o.case ? ` (lọc --case ${o.case})` : ''));
  const ra = path.resolve(o.ra ?? `ket-qua/${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`);
  fs.mkdirSync(ra, { recursive: true });
  console.log(`${cases.length} case → ${path.relative(process.cwd(), ra)}`);
  const ds: KetQuaCase[] = [];
  const lanChay = new Date().toISOString();
  // tong-hop.json – MỘT tệp cho cả lần chạy; mỗi case: trạng thái chạy, chữ đã ghi nhận, động tác đã làm, 1 bằng chứng (video)
  const ghiTongHop = () => fs.writeFileSync(path.join(ra, 'tong-hop.json'), JSON.stringify({
    lanChay, may: `${process.platform} ${process.arch}`, kichBan: path.resolve(duong),
    tongKet: { soCase: cases.length, daChay: ds.length, xong: ds.filter(k => k.chay === 'xong').length, hetGio: ds.filter(k => k.chay === 'het-gio').length, loi: ds.filter(k => k.chay === 'loi').length },
    cases: ds,
  }, null, 1));
  for (const c of cases){
    if (o.hat) c.hat = +o.hat;
    console.log(`▶ ${c.ten}${c.moTa ? ' – ' + c.moTa : ''}`);
    const kq = await chayCase(c, { ra, nen: o.nen as any, dem: o.dem ? +o.dem : undefined, quayVideo: o['khong-video'] !== 'true', phucVu: o['phuc-vu'], inRa: o['chi-tiet'] === 'true' });
    ds.push(kq);
    console.log(`  ${kq.chay === 'xong' ? '✓' : '✗'} ${kq.chay} · ${kq.giay}s` + (kq.loi ? ` · bước ${kq.loi.buoc} (dòng ${kq.loi.dong}) ${kq.loi.lenh}: ${kq.loi.thongBao}` : '') +
      (kq.ghiNhan.length ? ' · ghi nhận: ' + kq.ghiNhan.map(g => `${g.ten}=${g.thay ? 'thấy' : 'không'}`).join(', ') : ''));
    ghiTongHop();
  }
  const loi = ds.filter(k => k.chay !== 'xong').length;
  console.log(`xong: ${ds.length - loi}/${ds.length} case chạy hết · ${path.relative(process.cwd(), path.join(ra, 'tong-hop.json'))}`);
  return loi ? 1 : 0;
}

// bot dong-tac – danh sách động tác + kiểu sai có trong thư viện (cho người / Claude viết kịch bản)
async function inDongTac(o: Record<string, string>){
  const MAU = docMau();
  // @ts-ignore – module JS dùng chung với sân khấu
  const { KIEU_SAI, HIEU_CHINH } = await import('./dong-tac/kieu-sai.js');
  // @ts-ignore
  const { laGiu, giayGiuMacDinh } = await import('./dong-tac/thu-vien.js');
  const tim = o.tim?.toLowerCase();
  const theoTep: Record<string, string[]> = {};
  for (const id of Object.keys(MAU.dongTac)) (theoTep[MAU.tep[id]] ??= []).push(id);
  for (const [tep, ds] of Object.entries(theoTep)){
    const dong = ds.filter(id => !tim || id.toLowerCase().includes(tim) || MAU.dongTac[id].ten.toLowerCase().includes(tim));
    if (!dong.length) continue;
    console.log(`\n== ${tep.replace(/\.json$/, '')} (${ds.length})`);
    for (const id of dong){
      const d = MAU.dongTac[id], sai = Object.entries<any>(KIEU_SAI[id] ?? {}).map(([k, v]) => `${k} (${v.mo})`).join(', ');
      const nhip = laGiu(d) ? `giữ ${giayGiuMacDinh(d, MAU.GIAY_MUC)}s` : d.nhip ? `~${(d.nhip * (d.moiLan || 1)).toFixed(1)}s/lần` : `mẫu ${MAU.mau[d.mau].doDai.toFixed(1)}s`;
      console.log(`  ${id.padEnd(16)} "${d.ten}" · ${d.kieu} · ${nhip}${sai ? ' · kiểu sai: ' + sai : ''}${HIEU_CHINH[id] ? ' · có hiệu chỉnh theo cơ thể' : ''}`);
    }
  }
  console.log(`\n${Object.keys(MAU.dongTac).length} động tác · mẫu trích từ ${String(MAU.nguon || 'siroby-app').trim()} ngày ${MAU.trich}`);
  const c = docChuaHoTro();
  if (c){
    const n = Object.values(c.lyDo).reduce((s, l) => s + l.ds.length, 0);
    console.log(`\nCHƯA HỖ TRỢ ${n} động tác${o['chua-ho-tro'] ? '' : ' (xem đủ id: npm run bot -- dong-tac --chua-ho-tro)'}:`);
    for (const l of Object.values(c.lyDo)) console.log(`  ${String(l.ds.length).padStart(3)} · ${l.mo}` + (o['chua-ho-tro'] ? `\n        ${l.ds.map(x => x.id).join(', ')}` : ''));
  }
}

const { lenh, o, viTri } = docThamSo(process.argv.slice(2));
try {
  if (lenh === 'run') process.exitCode = await chay(viTri[0], o);
  else if (lenh === 'kiem'){ const cs = docKichBan(viTri[0] ?? ''); for (const c of cs) console.log(`✓ ${c.ten}: ${c.buoc.length} bước (${path.relative(process.cwd(), c.tep)})`); }
  else if (lenh === 'dong-tac') await inDongTac(o);
  else if (lenh === 'kha-thi') await khaThi(o);
  else if (lenh === 'thu-nhan-vat') await thuNhanVat(o);
  else console.log(`bot-front-cam
  bot run <kich-ban.yaml | thư-mục> [--case a,b] [--nen chup|truc-tiep|phong] [--hat 7] [--khong-video] [--chi-tiet] [--ra thư-mục]
  bot kiem <kich-ban.yaml | thư-mục>     (chỉ kiểm cú pháp)
  bot dong-tac [--tim squat] [--chua-ho-tro]   (danh sách động tác + kiểu sai; động tác chưa hỗ trợ + lý do)
  bot kha-thi [--url ${URL_MAC_DINH}] [--nen chup|truc-tiep|phong] [--dem 5]
              [--buoc "bam:Bắt đầu|cho:Đứng vào|lam:vay|nghi:3"] [--tu-dong [--sai dt=kiểu,…] [--bien-do dt=0.5,…]] [--den-khi chữ] [--hat 7] [--giay 30] [--chup 5] [--video] [--ra thư-mục]
              [--phuc-vu <siroby-app/dist/app>]  (tự phục vụ app nếu URL localhost chưa chạy)
  bot thu-nhan-vat [--nv be-trai-11] [--nen phong|chup|truc-tiep] [--hanh dung,vay,gioTay,dangTay] [--mat 0] [--hauky 0] [--ra thư-mục]`);
} catch (e: any) {
  if (e instanceof LoiKichBan){ console.error('KỊCH BẢN SAI:\n' + e.message); process.exitCode = 2; }
  else throw e;
}
