// KIỂU SAI có chủ đích – để thử app có nhắc / không đếm khi bé làm sai. Mỗi kiểu: sua(P) sửa dáng mẫu, hoặc mau = dùng mẫu khác.
// Đối chiếu bộ nhận của siroby-app (vui/2a-dong-tac-5.js, vui/22-tu-the.js).
export const KIEU_SAI = {
  xoayCo: {
    // nghiêng cả vai theo đầu (vai lệch > 9°) → app nên nhắc XC-VAI
    nghieng_ca_vai: { mo: 'nghiêng cả vai theo đầu', sua: P => { P.than.nghieng += (P.dau.nghieng || 0) * 0.6; return P; } },
  },
  xoayLung: {
    // xoay cả hông thay vì chỉ xoay ngực → app nên nhắc XOAY-HONG
    xoay_ca_hong: { mo: 'xoay cả hông', sua: P => { P.hong.xoay += P.than.xoay * 0.8; P.than.xoay *= 0.35; return P; } },
  },
  xoayTay: {
    // vòng tay NHỎ dang ngang (mẫu xoay vai) thay vì vòng tay to → app không nên đếm (kiem-thu/xoay-vong-tay-mau.mjs)
    vong_nho: { mo: 'vòng tay nhỏ dang ngang', mau: 'vongTay' },
  },
};

// HIỆU CHỈNH THEO CƠ THỂ BÉ TRAI – mẫu MAU3D dựng cho tỉ lệ robot Siroby / người giả của app; bé trai thật có đầu hẹp hơn so với vai…
// Mỗi mục: lý do + số đo (cong-cu/soi/khop-app.ts). Áp TRƯỚC biên độ / kiểu sai.
export const HIEU_CHINH = {
  // tai lệch / bề ngang vai: nghiêng 28° → 0,09; ×1,75 (49°) → 0,125; app cần ≥ 0,15 (TTN5.co mức Vừa).
  // → nghiêng đầu ×2,2 (~62°, "tai sang vai" như câu nhắc của app) + vai nghiêng theo nhẹ (~5–6°, dưới ngưỡng lỗi XC-VAI 9°) như người thật
  xoayCo: P => { const g = P.dau.nghieng || 0; P.dau.nghieng = g * 2.2; P.than.nghieng += g * 0.15; return P; },
  // app nhắc "NGHIÊNG THÊM" ở mọi lần với mẫu gốc (lần chạy ht2) → thân nghiêng sâu hơn
  // ×1,3 thì app bắt lỗi NL-XOAY "NGỰC NHÌN THẲNG" từ lần thứ 3 (lần chạy ht3) → ×1,15
  nghiengLuon: P => { P.than.nghieng *= 1.15; return P; },
  // (thử 21/11: chếch tay ra ngoài ở nửa trước để bớt "DUỖI THẲNG TAY" → app mất vòng, 0/3 "NÂNG KHUỶU LÊN" – bỏ; giữ mẫu gốc: được đếm, báo TAY-CO)
};
