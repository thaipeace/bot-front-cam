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
import { damBaoMayChuApp } from '../src/trinh-duyet/may-chu-app.js';

const arg = (k: string, md?: string) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : md; };
const URL_APP = arg('url', 'http://localhost:8790/vui/index.html?tro=ht003-khoi-dong-khop')!;
const CHON = arg('dong-tac')?.split(',').map(s => s.trim()).filter(Boolean) ?? null;
const RA = path.resolve(arg('ra', 'src/dong-tac/mau')!);
const RA_CHUA = path.resolve(path.dirname(RA), 'chua-ho-tro.json');

// kiểu HT_DT bot làm được: phát mẫu lặp (như máy chơi của app – vui/2b bot(): giaMau(mẫu, { so: 99 })) hoặc giữ – thả (giu / giuDk / thoiGian)
const KIEU_HO_TRO = ['lay', 'buoc', 'chay', 'chuoi', 'dam', 'giu', 'giuDk', 'thoiGian', 'tho', 'tanDung', 'huongDan', 'ld'];
// lý do chưa hỗ trợ + việc cần làm ở đợt sau
const LY_DO: Record<string, { mo: string; viec: string }> = {
  san: { mo: 'bài sàn / camera nghiêng: mẫu MAU3D dạng sàn (vị trí khớp, nằm – quỳ – chống tay)',
    viec: 'sân khấu camera thấp ngang hông + nhìn nghiêng; áp dáng từ vị trí khớp (sanDang) lên bé trai; dáng nằm / quỳ / chống tay có va chạm sàn' },
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
      const ly = !m ? 'kieu' : m.san ? 'san' : d.kieu === 'bong' ? 'bong' : d.kieu === 'dung' ? 'dung' : d.mauHuong ? 'huong' : !KIEU.includes(d.kieu) ? 'kieu' : null;
      if (ly){ chua.push({ id, ten: d.ten, kieu: d.kieu, mau: d.mau, ly }); continue; }
      dongTac[id] = { ten: d.ten, mau: d.mau, kieu: d.kieu, lay: d.lay, nhip: d.nhip, moiLan: d.moiLan || 1, giay: d.giay, giayMuc: d.giayMuc, giu: d.giu,
        giuLien: d.giuLien, buoc: d.buoc, doiBen: d.doiBen, viTri: d.viTri, bp: d.bp };
      if (!mau[d.mau]) mau[d.mau] = { ten: m.ten, ma: m.ma, lap: m.lap || 1, k: mauKhung(m, MAU_DUNG), nhac: m.nhac, doDai: mauDoDai(d.mau) };
    }
    return { nguon: 'siroby-app ' + ((window.VUI_CFG && VUI_CFG.phienBan) || window.PHIEN_BAN || '?'), MAU_DUNG, MAU_KT, MG, GIAY_MUC: HT_GIAY_MUC, dongTac, mau, chua, tong: Object.keys(HT_DT).length };
  })()`);
  const trich = new Date().toISOString().slice(0, 10);

  // ---- tệp mẫu theo nhóm bộ phận (bp của HT_DT) ----
  fs.mkdirSync(RA, { recursive: true });
  const nhom: Record<string, string[]> = {};
  for (const [id, x] of Object.entries<any>(du.dongTac)) (nhom[NHOM_BP[x.bp] ?? 'khac'] ??= []).push(id);
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
    fs.writeFileSync(path.join(RA, ten + '.json'), JSON.stringify({ nguon: du.nguon, trich, MAU_DUNG: du.MAU_DUNG, MAU_KT: du.MAU_KT, MG: du.MG, GIAY_MUC: du.GIAY_MUC, dongTac, mau }, null, 1));
    console.log(`${(ten + '.json').padEnd(16)} ${ds.length} động tác · ${Object.keys(mau).length} mẫu`);
  }

  // ---- chưa hỗ trợ ----
  if (!CHON) {
    const lyDo: any = {};
    for (const c of du.chua) (lyDo[c.ly] ??= { ...LY_DO[c.ly], ds: [] }).ds.push({ id: c.id, ten: c.ten, kieu: c.kieu, mau: c.mau });
    fs.writeFileSync(RA_CHUA, JSON.stringify({ nguon: du.nguon, trich, tongHT_DT: du.tong, lyDo }, null, 1));
    console.log(`\nCHƯA HỖ TRỢ ${du.chua.length}/${du.tong} động tác HT_DT → ${path.relative(process.cwd(), RA_CHUA)}`);
    for (const [k, l] of Object.entries<any>(lyDo)) console.log(`  ${String(l.ds.length).padStart(3)} · ${l.mo}\n        ${l.ds.map((x: any) => x.id).join(', ')}`);
  } else if (du.chua.length) console.log('\nCHƯA HỖ TRỢ (không ghi):', du.chua.map((c: any) => `${c.id} (${LY_DO[c.ly].mo})`).join('; '));

  // tên trùng: tu_dong nhận động tác theo TÊN app hiện – hai id cùng tên mà khác mẫu thì bot không phân biệt được
  const theoTen: Record<string, string[]> = {};
  for (const [id, x] of Object.entries<any>(du.dongTac)) (theoTen[x.ten] ??= []).push(id);
  const trung = Object.entries(theoTen).filter(([, ds]) => new Set(ds.map(id => du.dongTac[id].mau)).size > 1);
  if (trung.length) console.log('\nTÊN TRÙNG khác mẫu (tu_dong lấy id đầu):', trung.map(([t, ds]) => `"${t}": ${ds.join(' / ')}`).join(' · '));
  console.log(`\nhỗ trợ ${Object.keys(du.dongTac).length} động tác · ${Object.keys(du.mau).length} mẫu · nguồn ${String(du.nguon).trim()} → ${path.relative(process.cwd(), RA)}`);
} finally { await b.close(); tat?.(); }
