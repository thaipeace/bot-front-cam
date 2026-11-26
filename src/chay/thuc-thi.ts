// THỰC THI một case: mở Chrome + sân khấu + app (context mới – sạch dữ liệu), chạy từng bước, ghi nhật ký, trả kết quả.
// Bot KHÔNG phán pass/fail nghiệp vụ: chỉ ghi đã làm gì, thấy gì (ghi_nhan), và case có chạy hết được không.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from 'playwright';
import { moPhien, type PhienBot } from '../trinh-duyet/mo-chrome.js';
import { Mat, HetGio } from './mat.js';
import type { Case } from './doc-kich-ban.js';
import type { ChoChu } from './schema.js';
import { nenVideo } from '../bao-cao/nen-video.js';
import { docMau, banDoTen, troCuaUrl, docTro } from '../dong-tac/doc-mau.js';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MAU = docMau();
const CONG_VAO = /Giơ 2 tay lên để|Thấy cả người|Đứng yên một|Bước vào giữa|Quỳ hoặc đứng nghiêng|giơ tay qua đầu để|Đặt máy thấp/i;

/** bối cảnh sân khấu theo trò trong URL (thẻ bài – tro.json) + khoá của case: trò có động tác ngồi → ngồi chờ trên ghế */
function boiCanhCase(c: Case){
  const the = docTro()[troCuaUrl(c.url) ?? ''];
  return { ghe: c.ghe ?? 'don', ngoiCho: !!the && the.dongTac.some(id => MAU.dongTac[id]?.ngoi),
    ...(the?.cam === 'nghieng' ? { cam: 'nghieng', nghi: the.nghi, camera: c.camera } : {}) };
}

export type GhiNhan = { ten: string; thay: boolean; luc: number | null; chuThay?: string };
export type KetQuaCase = {
  case: string; tep: string; chay: 'xong' | 'loi' | 'het-gio';
  batDau: string; giay: number; hat: number;
  loi?: { buoc: number; dong: number; lenh: string; thongBao: string };
  ghiNhan: GhiNhan[];
  daLam: { luc: number; dongTac: string; kieuSai?: string }[];
  videoTu?: number;          // giây (theo đồng hồ case) lúc video bắt đầu – thời điểm trong video = luc − videoTu
  bangChung?: string;        // video tab app (đã nén) – đường dẫn tương đối so với tong-hop.json
  nhatKy: string;            // nhật ký dò lỗi – tương đối so với tong-hop.json
};
export type TuyChonChay = { ra: string; nen?: 'chup' | 'truc-tiep' | 'phong'; dem?: number; quayVideo?: boolean; phucVu?: string; hien?: boolean; inRa?: boolean };

const ngu = (ms: number) => new Promise(r => setTimeout(r, ms));

/** bấm: ưu tiên nút (role button) đúng tên, rồi checkbox / nhãn, rồi chữ bất kỳ; hoặc CSS */
async function bam(app: Page, b: string | { chu?: string; css?: string }, toiDa: number){
  if (typeof b !== 'string' && b.css) return app.locator(b.css).first().click({ timeout: toiDa * 1000 });
  const chu = typeof b === 'string' ? b : b.chu!;
  for (const l of [app.getByRole('button', { name: chu }), app.getByRole('checkbox', { name: chu }), app.getByText(chu)]){
    if (await l.count()) return l.first().click({ timeout: toiDa * 1000 });
  }
  return app.getByText(chu).first().click({ timeout: toiDa * 1000 });   // chờ tới khi hiện (hoặc hết giờ)
}

export async function chayCase(c: Case, o: TuyChonChay): Promise<KetQuaCase> {
  // đầu ra: <ra>/<case>.webm (bằng chứng) · <ra>/nhat-ky/<case>.txt · video thô quay tạm ở <ra>/.tam-<case>/
  const thuMuc = path.join(o.ra, `.tam-${c.ten}`);
  fs.mkdirSync(path.join(o.ra, 'nhat-ky'), { recursive: true });
  const nhatKy = path.join(o.ra, 'nhat-ky', `${c.ten}.txt`);
  fs.writeFileSync(nhatKy, '');
  const t0 = Date.now(), giay = () => (Date.now() - t0) / 1000;
  const log = (s: string) => { const d = `${giay().toFixed(1).padStart(6)}s  ${s}`; fs.appendFileSync(nhatKy, d + '\n'); if (o.inRa) console.log(`[${c.ten}] ${d}`); };
  const kq: KetQuaCase = { case: c.ten, tep: path.resolve(c.tep), chay: 'xong', batDau: new Date(t0).toISOString(), giay: 0, hat: c.hat, ghiNhan: [], daLam: [], nhatKy: path.relative(o.ra, nhatKy).split(path.sep).join('/') };

  let p: PhienBot | null = null, mat: Mat | null = null;
  let goc = 0;                                              // mốc timeline (giây từ lúc bắt đầu case)
  const lam = async (a: Record<string, unknown>) => {
    const r = await p!.sanKhau.evaluate(x => (window as any).__botSanKhau.lamDongTac(x), a);
    kq.daLam.push({ luc: +giay().toFixed(1), dongTac: a.dongTac as string, ...(a.kieuSai ? { kieuSai: a.kieuSai as string } : {}) });
    log(`LÀM ${JSON.stringify(r)}`);
    return r;
  };
  const dungLam = () => p!.sanKhau.evaluate(() => (window as any).__botSanKhau.dungDongTac());
  const choDongTacXong = async (toiDa: number) => {
    const het = Date.now() + toiDa * 1000;
    while ((await p!.sanKhau.evaluate(() => (window as any).__botSanKhau.dongTac().dongTac))){
      if (Date.now() > het) throw new HetGio(`động tác chưa xong sau ${toiDa} giây`);
      await ngu(100);
    }
  };
  const cho = async (chu: ChoChu, toiDa?: number) => { const s = await mat!.cho(chu, toiDa); log(`THẤY "${s}"`); return s; };

  let buocDang = -1;
  try {
    p = await moPhien({ url: c.url, nen: o.nen ?? c.nen ?? 'chup', dem: o.dem, hat: c.hat, phucVu: o.phucVu, hien: o.hien, boiCanh: boiCanhCase(c),
      quayVideo: o.quayVideo ? (fs.mkdirSync(thuMuc, { recursive: true }), thuMuc) : undefined });
    kq.videoTu = +giay().toFixed(1);     // tab app (và video của nó) vừa mở xong
    p.app.on('pageerror', e => log('LỖI TRANG APP: ' + e.message));
    mat = new Mat(p.app, moi => log('CHỮ MỚI: ' + moi.join(' | '))).batDau();
    log(`MỞ ${c.url} · hạt ${c.hat}`);

    for (const [i, b] of c.buoc.entries()){
      buocDang = i;
      if ('luc' in b && b.luc !== undefined){
        const doi = goc + b.luc - giay();
        if (doi > 0) await ngu(doi * 1000); else if (doi < -0.3) log(`TRỄ ${(-doi).toFixed(1)}s so với mốc luc ${b.luc}`);
      }
      log(`BƯỚC ${i + 1} (dòng ${b.dong}) ${b.lenh}`);
      switch (b.lenh){
        case 'bam': await bam(p.app, b.bam, b.toi_da); log(`BẤM ${JSON.stringify(b.bam)}`); break;
        case 'cho_chu': await cho(b.cho_chu); break;
        case 'lam': {
          const r = await lam({ dongTac: b.lam, soLan: b.so_lan, tocDo: b.toc_do, bienDo: b.bien_do, ben: b.ben, kieuSai: b.kieu_sai, giuGiay: b.giu_giay, chuanBi: b.chuan_bi });
          if (b.den_khi){ await cho(b.den_khi, b.toi_da ?? b.den_khi.toi_da); await dungLam(); }
          else if (typeof r.doDai === 'number') await choDongTacXong(b.toi_da ?? r.doDai + 10);
          break;
        }
        case 'dung_yen': await dungLam(); if (typeof b.dung_yen === 'number') await ngu(b.dung_yen * 1000); break;
        case 'nghi': await ngu(b.nghi * 1000); break;
        case 'goc_thoi_gian':
          if (b.goc_thoi_gian !== 'bay_gio') await cho(b.goc_thoi_gian);
          goc = giay(); log(`MỐC THỜI GIAN = ${goc.toFixed(1)}s`); break;
        case 'ghi_nhan': {
          const g: GhiNhan = { ten: b.ten ?? b.ghi_nhan.chu, thay: false, luc: null };
          try {
            const cu = b.nhin_lai ? mat.daThay(b.ghi_nhan, b.nhin_lai) : null;
            if (cu){ log(`ĐÃ THẤY "${cu.s}" lúc ${(cu.t - t0 / 1000).toFixed(1)}s (nhìn lại ${b.nhin_lai}s)`); g.chuThay = cu.s; g.luc = +(cu.t - t0 / 1000).toFixed(1); }
            else { g.chuThay = await cho(b.ghi_nhan); g.luc = +giay().toFixed(1); }
            g.thay = true;
          }
          catch (e) { if (!(e instanceof HetGio)) throw e; log(`GHI NHẬN: không thấy "${b.ghi_nhan.chu}" sau ${b.ghi_nhan.toi_da}s`); }
          kq.ghiNhan.push(g); break;
        }
        case 'tu_dong': {
          const TEN_DT = banDoTen(MAU, troCuaUrl(c.url));   // tên trùng → id theo thẻ bài của trò trong URL
          const td = b.tu_dong, het = Date.now() + td.toi_da * 1000;
          let dang = '';
          const nen = new Set<string>();   // tên động tác hiện lúc CỔNG VÀO (tên bài trùng tên động tác, vd. "BƯỚC CHÉO" của ht008) – không phải lượt
          for (;;){
            if (td.den_khi && mat.thay(td.den_khi)){ log(`THẤY "${td.den_khi.chu}" – hết tự động`); break; }
            if (Date.now() > het){ if (td.den_khi) throw new HetGio(`tự động: không thấy "${td.den_khi.chu}" sau ${td.toi_da} giây`); break; }
            let ten = [...new Set(mat.hien.map(s => TEN_DT.get(s)).filter(Boolean) as string[])];
            // cổng vào (2.51.2: thấy cả người → đứng yên → giơ 2 tay / đứng đúng chỗ 30 giây): đứng chờ như bé thật, không làm theo chữ trên màn
            if (mat.hien.some(s => CONG_VAO.test(s))){
              for (const x of ten) if (!nen.has(x)){ nen.add(x); log(`TỰ ĐỘNG: bỏ qua "${MAU.dongTac[x].ten}" (chữ ở cổng vào)`); }
              if (dang){ dang = ''; await dungLam(); }
              await ngu(100); continue;
            }
            if (ten.length > 1) ten = ten.filter(x => !nen.has(x));
            if (ten.length === 1 && ten[0] !== dang){
              dang = ten[0];
              log(`TỰ ĐỘNG → ${dang}`);
              await lam({ dongTac: dang, kieuSai: td.sai?.[dang], bienDo: td.bien_do?.[dang] });
            }
            await ngu(100);
          }
          await dungLam(); break;
        }
      }
    }
  } catch (e: any) {
    kq.chay = e instanceof HetGio ? 'het-gio' : 'loi';
    const b = c.buoc[buocDang];
    kq.loi = { buoc: buocDang + 1, dong: b?.dong ?? 0, lenh: b?.lenh ?? 'mở', thongBao: String(e.message).split('\n')[0] };
    log(`LỖI ${kq.chay} ở bước ${buocDang + 1} (dòng ${b?.dong}): ${kq.loi.thongBao}`);
  } finally {
    mat?.tat();
    if (p){
      const vApp = o.quayVideo ? await p.app.video()?.path().catch(() => undefined) : undefined;
      const vSK = o.quayVideo ? await p.sanKhau.video()?.path().catch(() => undefined) : undefined;
      await p.dong().catch(() => {});
      if (vSK) fs.rmSync(vSK, { force: true });              // chỉ giữ video tab app làm bằng chứng
      if (vApp && fs.existsSync(vApp)){
        const dich = path.join(o.ra, `${c.ten}.webm`), daNen = nenVideo(vApp, dich);
        kq.bangChung = path.basename(dich);
        log(`BẰNG CHỨNG ${kq.bangChung} · ${(fs.statSync(dich).size / 1e6).toFixed(1)} MB${daNen ? ' (đã nén)' : ' (không có ffmpeg – giữ nguyên)'}`);
      }
      fs.rmSync(thuMuc, { recursive: true, force: true });
    }
    kq.giay = +giay().toFixed(1);
    log(`KẾT THÚC: ${kq.chay} sau ${kq.giay}s`);
  }
  return kq;
}
