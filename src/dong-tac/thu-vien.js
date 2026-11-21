// THƯ VIỆN ĐỘNG TÁC – chạy một động tác HT_DT với tham số: số lần / làm mãi, tốc độ, biên độ, bên, kiểu sai, giây giữ.
// Mọi thứ là dáng P (định dạng MAU3D) → chuyển động tác = nội suy hai dáng (không giật). Cùng hạt → cùng chuyển động.
import { dangTai, noi, em, latGuong } from './mau.js';
import { KIEU_SAI, HIEU_CHINH } from './kieu-sai.js';

const sao = o => JSON.parse(JSON.stringify(o));
const ngauNhien = (n, hat) => { const x = Math.sin(n * 12.9898 + hat * 78.233) * 43758.5453; return x - Math.floor(x); };
const HOA = 0.35;   // giây hoà vào / ra động tác

/** kéo dài đoạn giữ (hai khung liền nhau giống hệt) của mẫu kiểu 'giu' thành `giay` giây */
function keoDaiGiu(k, giay){
  const i = k.findIndex((f, j) => j < k.length - 1 && JSON.stringify(f[1]) === JSON.stringify(k[j + 1][1]) && k[j + 1][0] > f[0]);
  if (i < 0) return k;
  const them = giay - (k[i + 1][0] - k[i][0]);
  return k.map(([t, p], j) => [j > i ? t + them : t, p]);
}

export function taoThuVien(MAU, { hat = 7 } = {}){
  const DUNG = MAU.MAU_DUNG;
  let hien = null;              // động tác đang làm
  let hoa = null;               // { tu: dáng lúc bắt đầu hoà, t0 }
  let cuoi = sao(DUNG);         // dáng khung trước
  let soDongTac = 0;

  function dangCho(t){          // đứng chờ: thở, đầu nhìn quanh nhẹ, đung đưa – vui tươi
    const P = sao(DUNG), s = (f, p) => Math.sin(t * 2 * Math.PI * f + p + hat);
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
    let k = m.k;
    if (dt.kieu === 'giu') k = keoDaiGiu(k, o.giuGiay ?? dt.giay ?? 10);
    const chu = k[k.length - 1][0];
    soDongTac++;
    const toc = (o.tocDo ?? 1) * (1 + 0.08 * (2 * ngauNhien(soDongTac, hat) - 1));   // người thật không đều tuyệt đối: ±8 %
    const moiLan = (dt.nhip || chu) * (dt.moiLan || 1);
    // chuẩn bị: đứng yên ở dáng đầu của động tác ~1,5 giây như người thật (0,35 giây đầu là hoà từ động tác trước) trước khi bắt đầu
    // (app lấy MỐC ĐỨNG khi đứng yên ≥ 0,3 giây – vd. nhón gót so độ cao với mốc này; làm liền không nghỉ thì mốc cũ, không đếm)
    const chuanBi = o.chuanBi ?? 1.5;
    const doDai = chuanBi + (dt.kieu === 'giu' ? chu / toc : o.soLan ? o.soLan * moiLan / toc : Infinity);
    hoa = { tu: sao(cuoi), t0: t };
    hien = { o, dt, k, chu, toc, doDai, t0: t, bienDo: o.bienDo ?? 1, sai, lap: dt.kieu !== 'giu', moiLan, chuanBi };
    return { dongTac: o.dongTac, mau: tenMau, giayMoiLan: +(moiLan / toc).toFixed(2), doDai: isFinite(doDai) ? +doDai.toFixed(1) : 'đến khi dừng' };
  }

  function dung(t){ if (hien){ hien = null; hoa = { tu: sao(cuoi), t0: t }; } }

  function dang(t){
    let P;
    if (hien){
      const g = Math.max(0, t - hien.t0 - hien.chuanBi) * hien.toc;
      if ((t - hien.t0) >= hien.doDai){ dung(t); return dang(t); }
      const tc = hien.lap ? g % hien.chu : Math.min(g, hien.chu);
      P = dangTai(hien.k, tc);
      if (HIEU_CHINH[hien.o.dongTac]) P = HIEU_CHINH[hien.o.dongTac](P);
      if (hien.bienDo !== 1) P = noi(DUNG, P, hien.bienDo);          // biên độ: giữa dáng đứng và dáng mẫu
      if (hien.sai && hien.sai.sua) P = hien.sai.sua(P);
      if (hien.o.ben === 'nguoc') P = latGuong(P);
    } else P = dangCho(t);
    if (hoa){ const u = (t - hoa.t0) / HOA; if (u >= 1) hoa = null; else P = noi(hoa.tu, P, em(u)); }
    cuoi = P;
    return P;
  }

  function trangThai(t){
    if (!hien) return { dongTac: null };
    const g = Math.max(0, t - hien.t0 - hien.chuanBi) * hien.toc;
    return { dongTac: hien.o.dongTac, kieuSai: hien.o.kieuSai || null, giay: +(t - hien.t0).toFixed(1), uocLan: +(g / hien.moiLan).toFixed(1),
      doDai: isFinite(hien.doDai) ? +hien.doDai.toFixed(1) : null };
  }

  return { batDau, dung, dang, trangThai, danhSach: () => Object.keys(MAU.dongTac) };
}
