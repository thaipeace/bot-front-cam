// THƯ VIỆN ĐỘNG TÁC – chạy một động tác HT_DT với tham số: số lần / làm mãi, tốc độ, biên độ, bên, kiểu sai, giây giữ.
// Mọi thứ là dáng P (định dạng MAU3D) → chuyển động tác = nội suy hai dáng (không giật). Cùng hạt → cùng chuyển động.
import { dangTai, noi, em, latGuong } from './mau.js';
import { KIEU_SAI, HIEU_CHINH } from './kieu-sai.js';
import { sanDangMau, nghiQ, gioTayQ } from './san.js';
import { sanTron } from './san-app.js';
// DÁNG trả về: mẫu đứng = dáng P (MAU3D) · bài sàn = { san: true, q } (dáng nhìn ngang của app – ap-dang-san.js)

const sao = o => JSON.parse(JSON.stringify(o));
const ngauNhien = (n, hat) => { const x = Math.sin(n * 12.9898 + hat * 78.233) * 43758.5453; return x - Math.floor(x); };
const HOA = 0.35;   // giây hoà vào / ra động tác
const THA = 0.8;    // giây thả dáng giữa hai lần giữ – như máy chơi của app (vui/2b bot(): "thả dáng 0,8 giây rồi mới giữ lần sau")

/** động tác GIỮ theo cách máy chơi của app chọn (vui/2b: htKieuGiu(D) && kieu !== 'tho' && !D.buoc) – làm mẫu một lần, giữ đủ giây, thả, lặp */
export const laGiu = dt => ['giu', 'giuDk', 'thoiGian'].includes(dt.kieu) && !dt.buoc;
/** giây giữ khi kịch bản không nói: mức KHÓ của app (giayMuc[2] hoặc giay × GIAY_MUC[2]) – bot không biết mức / thẻ bài, giữ lâu hơn vẫn được tính */
export function giayGiuMacDinh(dt, GIAY_MUC = [0.75, 1, 1.2]){
  if (dt.giayMuc) return Math.max(...dt.giayMuc);
  return Math.max(1, Math.round((dt.giay || 3) * GIAY_MUC[GIAY_MUC.length - 1]));
}

/** kéo dài đoạn giữ (hai khung liền nhau giống hệt) của mẫu kiểu 'giu' thành `giay` giây */
function keoDaiGiu(k, giay){
  const i = k.findIndex((f, j) => j < k.length - 1 && JSON.stringify(f[1]) === JSON.stringify(k[j + 1][1]) && k[j + 1][0] > f[0]);
  if (i < 0) return null;
  const them = giay - (k[i + 1][0] - k[i][0]);
  return k.map(([t, p], j) => [j > i ? t + them : t, p]);
}

export function taoThuVien(MAU, { hat = 7 } = {}){
  const DUNG = MAU.MAU_DUNG;
  let hien = null;              // động tác đang làm
  let hoa = null;               // { tu: dáng lúc bắt đầu hoà, t0 }
  let cuoi = sao(DUNG);         // dáng khung trước
  let soDongTac = 0;
  // trò NGỒI GHẾ (thẻ có động tác HT_DT.ngoi – HT079): chờ giữa các lượt bằng dáng ngồi đầu tiên của mẫu ngồi, không đứng dậy
  const MAU_NGOI = Object.values(MAU.dongTac).find(d => d.ngoi);
  let ngoiCho = false, troNgoi = false;   // troNgoi: trò ngồi – ĐỨNG ở cổng vào (app đòi "Đứng thẳng lên" rồi giơ tay), ngồi chờ từ lượt đầu
  // trò CAMERA NGHIÊNG (thẻ THE.cam = 'nghieng'): chờ ở cổng vào = quỳ / đứng nghiêng giơ tay qua đầu (như máy chơi – sanGioTay); sau lượt đầu = dáng nghỉ THE.nghi
  let sanCho = null;   // { nghi, cong: bool, t0 }

  function dangCho(t){
    if (sanCho){
      if (sanCho.cong) return { san: true, q: gioTayQ(MAU.SAN_Q, sanCho.nghi, Math.min(1, Math.max(0, (t - sanCho.t0 - 1.5) / 1.2))) };
      return { san: true, q: nghiQ(MAU.SAN_Q, sanCho.nghi) };
    }
    return dangChoDung(t);
  }
  function dangChoDung(t){          // đứng chờ: thở, đầu nhìn quanh nhẹ, đung đưa – vui tươi (trò ngồi: ngồi chờ, chỉ thở – nhìn quanh)
    const P = sao(ngoiCho && MAU_NGOI ? MAU.mau[MAU_NGOI.mau].k[0][1] : DUNG), s = (f, p) => Math.sin(t * 2 * Math.PI * f + p + hat);
    if (ngoiCho && MAU_NGOI){ P.than.gap += 1.5 * s(0.27, 0); P.dau.xoay += 5 * s(0.11, 2); P.dau.gat += 2 * s(0.15, 4); return P; }
    P.than.gap += 1.5 * s(0.27, 0); P.than.nghieng += 1.2 * s(0.18, 1);
    P.dau.xoay += 5 * s(0.11, 2); P.dau.nghieng = (P.dau.nghieng || 0) + 3 * s(0.23, 3); P.dau.gat += 2 * s(0.15, 4);
    P.hong.x += 0.015 * s(0.09, 5);
    return P;
  }

  function batDau(o, t){
    const dt = MAU.dongTac[o.dongTac];
    if (!dt) throw new Error('không có động tác ' + o.dongTac + ' (có: ' + Object.keys(MAU.dongTac).join(', ') + ')');
    const sai = o.kieuSai ? (KIEU_SAI[o.dongTac] || {})[o.kieuSai] : null;
    if (o.kieuSai && !sai) throw new Error(`động tác ${o.dongTac} không có kiểu sai "${o.kieuSai}" (có: ${Object.keys(KIEU_SAI[o.dongTac] || {}).join(', ') || 'không'})`);
    const tenMau = (sai && sai.mau) || dt.mau, m = MAU.mau[tenMau];
    if (!m) throw new Error('thiếu mẫu ' + tenMau);
    if (sanCho) sanCho.cong = false;   // đã vào bài – từ giờ chờ ở dáng nghỉ của thẻ
    if (troNgoi) ngoiCho = true;
    let k = m.k, cham = 1;
    const giu = laGiu(dt);
    if (giu){
      // giữ đủ giây (+0,6 giây dư): kéo dài đoạn đứng yên của mẫu; mẫu không có đoạn đứng yên thì làm chậm cả mẫu như máy chơi
      // của app (cham = (giây + 1,2) / 2 – "mẫu giữ ~2–2,6 giây, giữ lâu hơn thì làm chậm lại") · sau mỗi lần thả THA giây
      const giay = (o.giuGiay ?? giayGiuMacDinh(dt, MAU.GIAY_MUC)) + 0.6;
      const dai = keoDaiGiu(k, giay);
      if (dai) k = dai; else cham = Math.max(1, (giay + 1.2) / 2);
      k = [...k, [k[k.length - 1][0] + THA, k[k.length - 1][1]]];
    }
    const chu = k[k.length - 1][0] * cham;
    if (cham !== 1) k = k.map(([t, p]) => [t * cham, p]);
    soDongTac++;
    // người thật không đều tuyệt đối: ±8 % – trừ động tác giữ (giây giữ app đếm theo đồng hồ, làm nhanh hơn thì hụt giây)
    const toc = (o.tocDo ?? 1) * (giu ? 1 : 1 + 0.08 * (2 * ngauNhien(soDongTac, hat) - 1));
    const moiLan = giu ? chu : (dt.nhip || chu) * (dt.moiLan || 1);
    // chuẩn bị: đứng yên ở dáng đầu của động tác ~1,5 giây như người thật (0,35 giây đầu là hoà từ động tác trước) trước khi bắt đầu
    // (app lấy MỐC ĐỨNG khi đứng yên ≥ 0,3 giây – vd. nhón gót so độ cao với mốc này; làm liền không nghỉ thì mốc cũ, không đếm)
    const chuanBi = o.chuanBi ?? 1.5;
    // giữ: có giu_giay mà không so_lan = giữ MỘT lần (như trước) · không gì cả = giữ – thả – giữ… tới khi dừng
    const soLan = o.soLan ?? (giu && o.giuGiay ? 1 : null);
    const doDai = chuanBi + (soLan ? soLan * moiLan / toc : Infinity);
    hoa = { tu: sao(cuoi), t0: t };
    hien = { o, dt, k, chu, toc, doDai, t0: t, bienDo: o.bienDo ?? 1, sai, lap: true, moiLan, chuanBi, san: !!m.san, mm: m.san ? { k } : null };
    return { dongTac: o.dongTac, mau: tenMau, giayMoiLan: +(moiLan / toc).toFixed(2), doDai: isFinite(doDai) ? +doDai.toFixed(1) : 'đến khi dừng' };
  }

  function dung(t){ if (hien){ hien = null; hoa = { tu: sao(cuoi), t0: t }; } }

  function dang(t){
    let P;
    if (hien){
      const g = Math.max(0, t - hien.t0 - hien.chuanBi) * hien.toc;
      if ((t - hien.t0) >= hien.doDai){ dung(t); return dang(t); }
      const tc = hien.lap ? g % hien.chu : Math.min(g, hien.chu);
      if (hien.san) P = { san: true, q: sanDangMau(hien.mm, tc, hien.bienDo) };   // biên độ 0 = nằm / giữ im ở dáng đầu của động tác
      else {
      P = dangTai(hien.k, tc);
      if (HIEU_CHINH[hien.o.dongTac]) P = HIEU_CHINH[hien.o.dongTac](P);
      if (hien.bienDo !== 1) P = noi(DUNG, P, hien.bienDo);          // biên độ: giữa dáng đứng và dáng mẫu
      if (hien.sai && hien.sai.sua) P = hien.sai.sua(P);
      if (hien.o.ben === 'nguoc') P = latGuong(P);
      }
    } else P = dangCho(t);
    if (hoa){ const u = (t - hoa.t0) / HOA;
      if (u >= 1) hoa = null;
      else if (!!hoa.tu.san === !!P.san) P = P.san ? { san: true, q: sanTron(hoa.tu.q, P.q, em(u)) } : noi(hoa.tu, P, em(u));   // khác loại dáng (đứng ↔ sàn): đổi ngay
    }
    cuoi = P;
    return P;
  }

  function trangThai(t){
    if (!hien) return { dongTac: null };
    const g = Math.max(0, t - hien.t0 - hien.chuanBi) * hien.toc;
    return { dongTac: hien.o.dongTac, kieuSai: hien.o.kieuSai || null, giay: +(t - hien.t0).toFixed(1), uocLan: +(g / hien.moiLan).toFixed(1),
      doDai: isFinite(hien.doDai) ? +hien.doDai.toFixed(1) : null };
  }

  return { batDau, dung, dang, trangThai, danhSach: () => Object.keys(MAU.dongTac),
    /** trò camera nghiêng: { nghi } (dáng nghỉ của thẻ) – chờ ở cổng vào bằng quỳ / đứng nghiêng giơ tay; null = trò đứng */
    datSanCho(o, t = 0){ sanCho = o ? { nghi: o.nghi || 'quyNgoi', cong: true, t0: t } : null; },
    /** trò ngồi ghế: chờ ở dáng ngồi */
    datNgoiCho(v){ troNgoi = !!v; ngoiCho = false; },
    /** đang ngồi (động tác ngồi hoặc ngồi chờ) – sân khấu hiện ghế */
    dangNgoi(){ return hien ? !!hien.dt.ngoi : ngoiCho && !!MAU_NGOI; } };
}
