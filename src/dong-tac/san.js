// BÀI SÀN – dáng q nhìn ngang của app (vui/2h-san.js) theo thời gian, dáng nghỉ / cổng vào, đồ vật đỡ (ghế, hộp, tường).
// Dựng vị trí khớp bằng chính sanKhop của app (./san-app.js – sinh tự động bởi cong-cu/lay-mau3d.ts), với TỈ LỆ CƠ THỂ BÉ TRAI (Ls).
import { sanKhop, sanTron, sanDu, sanXoayKhoa, mEm, clamp, lerp, SAN_DAY } from './san-app.js';

/** dáng ở giây t của mẫu sàn m (MAU3D[id] đã trích: k = [[giây, q]]) – như sanDang của app; bien < 1: kéo về dáng đầu (làm nhỏ / nằm im) */
export function sanDangMau(m, t, bien = 1){
  const k = m._sk || (m._sk = m.k.map(([tt, q]) => [tt, sanXoayKhoa(sanDu(q))])), T = k[k.length - 1][0], u = T ? ((t % T) + T) % T : 0;
  let i = 0; while (i < k.length - 2 && k[i + 1][0] <= u) i++;
  const [t0, q0] = k[i], [t1, q1] = k[Math.min(i + 1, k.length - 1)], w = t1 > t0 ? mEm(clamp((u - t0) / (t1 - t0), 0, 1)) : 0;
  const q = sanTron(q0, q1, w);
  return bien < 1 ? sanTron(k[0][1], q, Math.max(0, bien)) : q;
}

/** dáng nghỉ của trò camera nghiêng (thẻ THE.nghi: namNgua | quyNgoi | bon | dung; mặc định quỳ ngồi trên gót) */
export const nghiQ = (SAN_Q, ten) => sanXoayKhoa(sanDu(SAN_Q[ten] || SAN_Q.quyNgoi));

/** cổng vào bài sàn (app: sanGioTay): quỳ (hoặc đứng nghiêng nếu nghỉ 'dung') rồi giơ tay qua đầu theo g 0..1 */
export function gioTayQ(SAN_Q, nghiSan, g){
  const q = sanDu(nghiSan === 'dung' ? SAN_Q.dung : SAN_Q.quyNgoi); g = clamp(g, 0, 1);
  return sanXoayKhoa(g > 0.01 ? Object.assign({}, q, { u: lerp(q.u, 90, g), a: lerp(q.a, 90, g), u2: lerp(q.u2 ?? q.u, 90, g), a2: lerp(q.a2 ?? q.a, 90, g) }) : q);
}

/** vị trí khớp (đơn vị: chiều cao người, sàn y = 0, x sang PHẢI màn app, z về phía máy) theo tỉ lệ Ls của bé trai */
export const khopSan = (q, Ls) => sanKhop(q, Ls, SAN_DAY);

/** đồ vật đỡ như app vẽ cho Siroby 3D (sanVe3D): ghế / bục dưới điểm chạm có độ cao, hộp theo chỗ neo, tường trước bàn tay.
 *  Trả về hộp { x (tâm theo trục thân, x app), y (tâm), cao, day (dọc thân), rong (ngang – về phía máy) } – đơn vị chiều cao người */
export function vatSan(q, P){
  const R = 1 / 4.1, vat = [];   // app tính theo rig Siroby cao 4,1 – đổi ra chiều cao người
  for (const c of (q.cham || [])) if (Array.isArray(c) && P[c[0]]){ const h = c[1], x = P[c[0]][0] + (c[0] === 'sh' ? 0.3 * R * Math.sign(P.sh[0] - P.hip[0]) : 0); vat.push({ x, y: h / 2, cao: h, day: 0.9 * R, rong: 1.8 * R }); }
  for (const [x, h, d] of (q.hop || [])){ const X = (x + (q.dx || 0)) * (q.f < 0 ? -1 : 1); vat.push({ x: X, y: h / 2, cao: h, day: d, rong: 1.8 * R }); }
  for (const [x, h, d] of (q.hopCo || [])){ const X = x * (q.f < 0 ? -1 : 1); vat.push({ x: X, y: h / 2, cao: h, day: d, rong: 1.8 * R }); }
  if (q.tuong){ const d = Math.sign(P.wr[0] - P.sh[0]) || 1, x = (d > 0 ? Math.max(P.wr[0], P.wr2[0]) : Math.min(P.wr[0], P.wr2[0])) + d * 0.3 * R; vat.push({ x, y: 2.4 * R, cao: 4.8 * R, day: 0.3 * R, rong: 3 * R, tuong: true }); }
  return vat;
}
