// MẪU ĐỘNG TÁC – tái dựng phần toán của siroby-app (vui/26-siroby-mau.js: mNoi, mEm, mauDang, g3Quay, g3Ik, mauKhop)
// để bé trai làm ĐÚNG khung hình chuẩn mà app dùng cho Siroby 3D và người giả. Dữ liệu: ./mau/*.json (cong-cu/lay-mau3d.ts).
// Toạ độ mẫu: y lên, +z về phía camera, x −1 = bên TRÁI màn hình của APP (app soi gương ảnh camera → = tay / chân TRÁI của bé; apDang lật gương dáng trước khi áp).
const D2R = Math.PI / 180;

export async function napMau(url = '/__bot/dong-tac/mau/_tat-ca.json'){   // mọi tệp mau/*.json gộp lại (doc-mau.ts, route trong mo-chrome.ts)
  const r = await fetch(url); if (!r.ok) throw new Error('không nạp được ' + url);
  return r.json();
}

/** nội suy dáng (số: tuyến tính · chuỗi: lấy nửa · mảng / đối tượng: từng phần) – như mNoi */
export function noi(a, b, t){
  if (typeof a === 'number') return a + ((b ?? a) - a) * t;
  if (typeof a === 'string') return t < 0.5 ? a : b;
  if (Array.isArray(a)) return a.map((x, i) => noi(x, b[i], t));
  if (a && typeof a === 'object'){ const r = {}; for (const k in a) r[k] = noi(a[k], b ? b[k] : a[k], t); return r; }
  return a;
}
export const em = t => t * t * (3 - 2 * t);

/** dáng tại thời điểm t (giây) trong danh sách khung [[giây, dáng]] – như mauDang */
export function dangTai(k, t){
  const T = k[k.length - 1][0]; t = Math.max(0, Math.min(T, t));
  let i = 0; while (i < k.length - 2 && t > k[i + 1][0]) i++;
  const [ga, a] = k[i], [gb, b] = k[i + 1], u = gb > ga ? em((t - ga) / (gb - ga)) : 1;
  return noi(a, b, u);
}

/** lật gương dáng: bên trái màn ↔ bên phải màn */
export function latGuong(P){
  const Q = JSON.parse(JSON.stringify(P));
  Q.hong.x = -P.hong.x; Q.hong.nghieng = -P.hong.nghieng; Q.hong.xoay = -P.hong.xoay;
  for (const k of ['than', 'dau']){ Q[k].nghieng = -(P[k].nghieng || 0); Q[k].xoay = -(P[k].xoay || 0); }
  Q.tay = [P.tay[1], P.tay[0]].map(t => ({ c: [-t.c[0], t.c[1], t.c[2]], k: [-t.k[0], t.k[1], t.k[2]] }));
  Q.chan = [P.chan[1], P.chan[0]].map(c => ({ ...c, x: -c.x }));        // c.xoay (mũi chân xoay ra) đối xứng sẵn theo bên
  return Q;
}

// ---------- toán 3D (ma trận 3×3 hàng) ----------
export function quay(gx, gy, gz){   // Euler 'YXZ' (độ) = Ry · Rx · Rz – như three.js
  const x = gx * D2R, y = gy * D2R, z = gz * D2R, cx = Math.cos(x), sx = Math.sin(x), cy = Math.cos(y), sy = Math.sin(y), cz = Math.cos(z), sz = Math.sin(z);
  return [cy * cz + sy * sx * sz, -cy * sz + sy * sx * cz, sy * cx, cx * sz, cx * cz, -sx, -sy * cz + cy * sx * sz, sy * sz + cy * sx * cz, cy * cx];
}
const cong = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], tru = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], nhan = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const vo = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], dai = a => Math.hypot(a[0], a[1], a[2]);
const nhanM = (A, B) => { const R = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) R[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]; return R; };
const apM = (M, v) => [M[0] * v[0] + M[1] * v[1] + M[2] * v[2], M[3] * v[0] + M[4] * v[1] + M[5] * v[2], M[6] * v[0] + M[7] * v[1] + M[8] * v[2]];
function ik(A, C, l1, l2, cuc){
  const v = tru(C, A); let d = dai(v); const u = nhan(v, 1 / (d || 1));
  if (d > l1 + l2 - 1e-3){ d = l1 + l2 - 1e-3; C = cong(A, nhan(u, d)); }
  d = Math.max(d, Math.abs(l1 - l2) + 1e-3);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  let p = tru(cuc, nhan(u, vo(cuc, u))); const lp = dai(p); p = lp < 1e-6 ? [0, 0, 1] : nhan(p, 1 / lp);
  return [cong(cong(A, nhan(u, a)), nhan(p, h)), C];
}

/** vị trí khớp của dáng P (tỉ lệ người giả MG của app) + ma trận hông / thân / đầu – như mauKhop */
export function khop(P, MG, KT){
  const MH = quay(P.hong.gap, P.hong.xoay, P.hong.nghieng), MT = nhanM(MH, quay(P.than.gap, P.than.xoay, P.than.nghieng));
  const goc = [P.hong.x * MG.sx, MG.dung + P.hong.y * MG.sl, P.hong.z * MG.sl], tg = (v, M = MT) => cong(apM(M, v), goc), J = { tay: [], chan: [], MH, MT };
  for (const i of [0, 1]){
    const s = i ? 1 : -1, t = P.tay[i], vai = tg([s * MG.vaiX, 1, 0]);
    const dich = tg([s * MG.vaiX + t.c[0] - s * KT.vaiX, t.c[1], t.c[2]]), [khuyu, co] = ik(vai, dich, MG.ua, MG.fa, apM(MT, t.k));
    J.tay.push({ vai, khuyu, co });
    const c = P.chan[i], hang = tg([s * MG.hongX, 0, 0], MH), xo = s * c.xoay * D2R;
    const [goi, coC] = ik(hang, [c.x * MG.sx, c.nhac * MG.sl, c.z * MG.sl], MG.th, MG.sh, [Math.sin(xo) + s * 0.12, 0.05, Math.cos(xo)]);
    const MB = quay(c.gat, xo / D2R, 0);
    J.chan.push({ hang, goi, co: coC, mui: cong(coC, apM(MB, [0, -0.16, 0.3])), got: cong(coC, apM(MB, [0, -0.08, -0.12])) });
  }
  J.MD = nhanM(MT, quay(P.dau.gat, P.dau.xoay, P.dau.nghieng || 0));
  J.hong = goc;
  return J;
}
