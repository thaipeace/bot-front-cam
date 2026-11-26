// Trích dữ liệu động tác chuẩn từ bản dựng siroby-app → src/dong-tac/mau/<nhóm>.json + src/dong-tac/chua-ho-tro.json
//   - HT_DT[động tác]: tên, mẫu, kiểu (lay / giu / …), nhịp (giây / lần), moiLan, giây giữ, doiBen, bp (bộ phận – dùng để chia nhóm tệp)
//   - MAU3D[mẫu]: khung hình chính đã ghép dáng đứng (mauKhung), câu nhắc, số lần lặp khi làm mẫu
//   - MAU_DUNG (dáng đứng), MAU_KT, MG (tỉ lệ người giả), GIAY_MUC (hệ số giây giữ theo mức) – để tái dựng mauKhop bên bot
// Danh sách động tác lấy NGAY TRONG TRANG (HT_DT, MAU3D là biến toàn cục của dist/app, nạp đủ ở mọi trò – mặc định mở HT003) – không chép vào mã bot.
// Động tác bot chưa làm được (mẫu sàn, bóng ảo, dừng theo lệnh, theo hướng Siroby chỉ, kiểu lạ) ghi riêng kèm lý do.
//
// Chạy lại khi app đổi mẫu (trong repo này):
//   npx tsx cong-cu/lay-mau3d.ts --phuc-vu <siroby-app>/dist/_bot/app          mọi động tác
//   npx tsx cong-cu/lay-mau3d.ts --phuc-vu … --dong-tac squat,jab              chỉ vài động tác (ghi đè vào tệp nhóm của chúng, giữ các động tác khác)
//   [--url http://localhost:8790/vui/index.html?tro=…] [--ra src/dong-tac/mau]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { damBaoMayChuApp, timThuMucApp } from '../src/trinh-duyet/may-chu-app.js';

const arg = (k: string, md?: string) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : md; };
const URL_APP = arg('url', 'http://localhost:8790/vui/index.html?tro=ht003-khoi-dong-khop')!;
const CHON = arg('dong-tac')?.split(',').map(s => s.trim()).filter(Boolean) ?? null;
const RA = path.resolve(arg('ra', 'src/dong-tac/mau')!);
const RA_CHUA = path.resolve(path.dirname(RA), 'chua-ho-tro.json');
const RA_TRO = path.resolve(path.dirname(RA), 'tro.json');
const RA_SAN_HAM = path.resolve(path.dirname(RA), 'san-app.js');
// hàm + hằng của app dựng dáng BÀI SÀN (vui/2h-san.js) – sinh nguyên văn từ trang thành src/dong-tac/san-app.js (bot gọi đúng hàm của app, không chép tay)
const SAN_TEN = ['M_D2R', 'clamp', 'lerp', 'mEm', 'MAU_KT', 'SAN_L', 'SAN_DAY', 'SAN_L3', 'SAN_DAY3', 'SAN_TREN', 'SAN_GOC', 'SAN_TRUNG', 'SAN_CHI',
  'sanHuong', 'sanCong', 'sanTayIK', 'sanKhop', 'sanTron', 'sanDu', 'sanXoayKhoa'];

// kiểu HT_DT bot làm được: phát mẫu lặp (như máy chơi của app – vui/2b bot(): giaMau(mẫu, { so: 99 })) hoặc giữ – thả (giu / giuDk / thoiGian)
const KIEU_HO_TRO = ['lay', 'buoc', 'chay', 'chuoi', 'dam', 'giu', 'giuDk', 'thoiGian', 'tho', 'tanDung', 'huongDan', 'ld'];
// lý do chưa hỗ trợ + việc cần làm ở đợt sau
const LY_DO: Record<string, { mo: string; viec: string }> = {
  bong: { mo: 'bóng ảo: phải đưa tay tới đúng chỗ quả bóng Siroby tung (vị trí đổi mỗi lần)',
    viec: 'mắt bot đọc vị trí bóng trên màn (hoặc trạng thái app) rồi với tay tới đó – cần IK tay theo điểm đích' },
  dung: { mo: 'chạy / đi rồi DỪNG theo lệnh trên màn (đèn đỏ, "DỪNG!") – phản xạ theo app',
    viec: 'tu_dong đọc lệnh dừng trên màn rồi đứng hình (thêm sự kiện "thấy chữ → dừng" cho động tác kiểu dung)' },
  huong: { mo: 'mỗi lần một HƯỚNG do Siroby chỉ (mauHuong) – phải đọc mũi tên trên màn',
    viec: 'mắt bot đọc hướng (mũi tên / chữ) rồi phát mẫu của hướng đó (mauHuong)' },
  kieu: { mo: 'kiểu động tác thư viện bot chưa hiểu',
    viec: 'xem bộ nhận của kiểu này trong vui/2b-he-thong.js rồi thêm vào KIEU_HO_TRO / thu-vien.js' },
};
const NHOM_BP: Record<string, string> = { tay: 'tay', chan: 'chan', goi: 'goi', hong: 'hong', het: 'toan-than' };

const tat = await damBaoMayChuApp(URL_APP, arg('phuc-vu'));
const b = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const p = await b.newPage();
  await p.goto(URL_APP, { timeout: 90_000 });
  await p.waitForFunction('typeof MAU3D !== "undefined" && typeof HT_DT !== "undefined" && typeof mauKhung === "function"', null, { timeout: 90_000 });
  const du: any = await p.evaluate(`(() => {
    const KIEU = ${JSON.stringify(KIEU_HO_TRO)}, chon = ${JSON.stringify(CHON)};
    const dongTac = {}, mau = {}, chua = [];
    for (const id of chon || Object.keys(HT_DT)){
      const d = HT_DT[id]; if (!d) throw new Error('HT_DT không có ' + id);
      const m = MAU3D[d.mau];
      const ly = !m ? 'kieu' : d.kieu === 'bong' ? 'bong' : d.kieu === 'dung' ? 'dung' : d.mauHuong ? 'huong' : !KIEU.includes(d.kieu) ? 'kieu'
        : null;
      if (ly){ chua.push({ id, ten: d.ten, kieu: d.kieu, mau: d.mau, ly }); continue; }
      dongTac[id] = { ten: d.ten, mau: d.mau, kieu: d.kieu, lay: d.lay, nhip: d.nhip, moiLan: d.moiLan || 1, giay: d.giay, giayMuc: d.giayMuc, giu: d.giu,
        giuLien: d.giuLien, buoc: d.buoc, doiBen: d.doiBen, viTri: d.viTri, bp: d.bp, ngoi: d.ngoi, san: !!m.san };
      // mẫu sàn: khung q GỐC (góc từng đoạn nhìn ngang – bot dựng vị trí khớp bằng sanKhop của app); mẫu đứng: khung đã ghép dáng đứng
      if (!mau[d.mau]) mau[d.mau] = m.san ? { ten: m.ten, ma: m.ma, lap: m.lap || 1, san: true, k: JSON.parse(JSON.stringify(m.k)), nhac: m.nhac, doDai: mauDoDai(d.mau) }
        : { ten: m.ten, ma: m.ma, lap: m.lap || 1, k: mauKhung(m, MAU_DUNG), nhac: m.nhac, doDai: mauDoDai(d.mau) };
    }
    // mã nguồn hàm / hằng bài sàn (eval trực tiếp thấy được hằng toàn cục của các tệp vui/*)
    const ma = ${JSON.stringify(SAN_TEN)}.map(n => { const v = eval(n);
      if (typeof v === 'function'){ const s = v.toString(); return /^(async\s+)?function\b/.test(s) ? s : 'const ' + n + ' = ' + s + ';'; }
      if (v instanceof Set) return 'const ' + n + ' = new Set(' + JSON.stringify([...v]) + ');';
      return 'const ' + n + ' = ' + JSON.stringify(v) + ';'; });
    return { nguon: 'siroby-app ' + ((window.VUI_CFG && VUI_CFG.phienBan) || window.PHIEN_BAN || '?'), MAU_DUNG, MAU_KT, MG, GIAY_MUC: HT_GIAY_MUC, dongTac, mau, chua, tong: Object.keys(HT_DT).length,
      SAN_Q: JSON.parse(JSON.stringify(SAN_Q)), sanMa: ma };
  })()`);
  const trich = new Date().toISOString().slice(0, 10);

  // ---- tệp mẫu theo nhóm bộ phận (bp của HT_DT) ----
  fs.mkdirSync(RA, { recursive: true });
  const nhom: Record<string, string[]> = {};
  for (const [id, x] of Object.entries<any>(du.dongTac)) (nhom[x.san ? 'san' : NHOM_BP[x.bp] ?? 'khac'] ??= []).push(id);   // bài sàn: một nhóm (camera nghiêng)
  // chạy toàn bộ: xoá tệp nhóm cũ (kể cả ht003.json của bản đầu) để động tác không nằm hai nơi; chạy --dong-tac: chỉ ghi đè các động tác được chọn
  const cu: Record<string, any> = {};
  for (const f of fs.readdirSync(RA).filter(f => f.endsWith('.json'))) {
    const d = JSON.parse(fs.readFileSync(path.join(RA, f), 'utf8'));
    if (CHON) for (const [id, x] of Object.entries<any>(d.dongTac ?? {})) if (!du.dongTac[id]) cu[id] = { x, m: d.mau[x.mau], f: f.replace(/\.json$/, '') };
    fs.rmSync(path.join(RA, f));
  }
  for (const [id, { x, f }] of Object.entries<any>(cu)) (nhom[f] ??= []).push(id);
  for (const [ten, ds] of Object.entries(nhom).sort()) {
    const dongTac: any = {}, mau: any = {};
    for (const id of ds.sort()) {
      const x = du.dongTac[id] ?? cu[id].x; dongTac[id] = x;
      mau[x.mau] = du.mau[x.mau] ?? cu[id].m;
    }
    fs.writeFileSync(path.join(RA, ten + '.json'), JSON.stringify({ nguon: du.nguon, trich, MAU_DUNG: du.MAU_DUNG, MAU_KT: du.MAU_KT, MG: du.MG, GIAY_MUC: du.GIAY_MUC,
      ...(ten === 'san' ? { SAN_Q: du.SAN_Q } : {}), dongTac, mau }, null, 1));
    console.log(`${(ten + '.json').padEnd(16)} ${ds.length} động tác · ${Object.keys(mau).length} mẫu`);
  }

  // ---- hàm bài sàn của app → module ES cho sân khấu ----
  fs.writeFileSync(RA_SAN_HAM, `// SINH TỰ ĐỘNG bởi cong-cu/lay-mau3d.ts từ ${String(du.nguon).trim()} ngày ${trich} – ĐỪNG SỬA TAY (chạy lại công cụ khi app đổi).
// Hàm / hằng dựng dáng bài sàn của siroby-app (vui/2h-san.js: sanKhop, sanTron, sanDu, sanXoayKhoa…) lấy nguyên văn trong trang.
/* eslint-disable */
${du.sanMa.join('\n')}
export { ${SAN_TEN.join(', ')} };
`);
  console.log(`hàm bài sàn: ${SAN_TEN.length} tên → ${path.relative(process.cwd(), RA_SAN_HAM)}`);

  // ---- chưa hỗ trợ ----
  if (!CHON) {
    const lyDo: any = {};
    for (const c of du.chua) (lyDo[c.ly] ??= { ...LY_DO[c.ly], ds: [] }).ds.push({ id: c.id, ten: c.ten, kieu: c.kieu, mau: c.mau });
    fs.writeFileSync(RA_CHUA, JSON.stringify({ nguon: du.nguon, trich, tongHT_DT: du.tong, lyDo }, null, 1));
    console.log(`\nCHƯA HỖ TRỢ ${du.chua.length}/${du.tong} động tác HT_DT → ${path.relative(process.cwd(), RA_CHUA)}`);
    for (const [k, l] of Object.entries<any>(lyDo)) console.log(`  ${String(l.ds.length).padStart(3)} · ${l.mo}\n        ${l.ds.map((x: any) => x.id).join(', ')}`);
  } else if (du.chua.length) console.log('\nCHƯA HỖ TRỢ (không ghi):', du.chua.map((c: any) => `${c.id} (${LY_DO[c.ly].mo})`).join('; '));

  // ---- thẻ bài của từng trò (bản dựng: vui/tro/<id>.<mã>.js, mỗi trò một tệp; thẻ THE còn nguyên dạng chữ) ----
  if (!CHON) {
    const goc = timThuMucApp(arg('phuc-vu')); if (!goc) throw new Error('không thấy thư mục bản dựng (--phuc-vu) để đọc thẻ bài');
    const tro: Record<string, any> = {};
    for (const f of fs.readdirSync(path.join(goc, 'vui/tro')).filter(f => /^ht\d+.*\.js$/.test(f)).sort()) {
      const id = f.replace(/\.[0-9a-f]+\.js$/, ''), s = fs.readFileSync(path.join(goc, 'vui/tro', f), 'utf8'), a = s.search(/\{ma:"HT\d+"/);
      if (a < 0) continue;
      let i = a, sau = 0; for (; i < s.length; i++) { if (s[i] === '{') sau++; else if (s[i] === '}' && --sau === 0) break; }
      let the: any; try { the = new Function('return (' + s.slice(a, i + 1) + ')')(); } catch (e: any) { console.log('  (không đọc được thẻ ' + id + ': ' + e.message + ')'); continue; }
      const ds = new Set<string>(the.hoc || []);
      for (const v of the.vong || []) { for (const x of v.ds || []) ds.add(x[0]); if (v.chot) ds.add(v.chot[0]); }
      tro[id] = { ma: the.ma, ...(the.cam ? { cam: the.cam } : {}), ...(the.nghi ? { nghi: the.nghi } : {}), hoc: the.hoc, dongTac: [...ds] };
    }
    fs.writeFileSync(RA_TRO, JSON.stringify({ nguon: du.nguon, trich, tro }, null, 1));
    console.log(`thẻ bài: ${Object.keys(tro).length} trò (${Object.values(tro).filter((t: any) => t.cam === 'nghieng').length} camera nghiêng) → ${path.relative(process.cwd(), RA_TRO)}`);
  }

  // tên trùng: tu_dong nhận động tác theo TÊN app hiện – hai id cùng tên mà khác mẫu thì bot không phân biệt được
  const theoTen: Record<string, string[]> = {};
  for (const [id, x] of Object.entries<any>(du.dongTac)) (theoTen[x.ten] ??= []).push(id);
  const trung = Object.entries(theoTen).filter(([, ds]) => new Set(ds.map(id => du.dongTac[id].mau)).size > 1);
  if (trung.length) console.log('\nTÊN TRÙNG khác mẫu (tu_dong chọn theo thẻ bài của trò đang chơi – tro.json):', trung.map(([t, ds]) => `"${t}": ${ds.join(' / ')}`).join(' · '));
  console.log(`\nhỗ trợ ${Object.keys(du.dongTac).length} động tác · ${Object.keys(du.mau).length} mẫu · nguồn ${String(du.nguon).trim()} → ${path.relative(process.cwd(), RA)}`);
} finally { await b.close(); tat?.(); }
