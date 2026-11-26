// ÁP DÁNG BÀI SÀN lên bé trai – như sanVe3D của app (vui/2h-san.js) nhưng bằng xương người thật:
//  1. vị trí khớp P = sanKhop(q, tỉ lệ bé trai) – app tự cân bằng điểm chạm (tay + mũi chân cùng chạm sàn…) theo đúng tỉ lệ này
//  2. đổi sang toạ độ cảnh: x app (phải màn – app SOI GƯƠNG ảnh) → −x cảnh; y lên; z (phía máy) → +z cảnh (camera ở +z)
//  3. thân: trục dọc hông → vai, trục ngang vai gần → vai xa, mặt về phía mũi; cột sống thẳng (app: thân cứng một khối); đầu gật theo góc cổ q.n
//  4. tay chân theo HƯỚNG từng đoạn (không phụ thuộc tỉ lệ) · 5. dời cả người cho tâm hai khớp hông đúng chỗ P.hip
// Chi phía XA máy bị thân che THẬT (ảnh dựng 3D) – thứ người giả 2D của app không có.
import * as THREE from 'three';
import { chiDoan } from '../san-khau/nhan-vat.js';
import { khopSan } from './san.js';

const _qG = new THREE.Quaternion(), _qP = new THREE.Quaternion(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4();
const _v = new THREE.Vector3(), _w = new THREE.Vector3();

function datQC(nv, b, qC){   // đặt hướng xương theo toạ độ nhân vật (goc)
  nv.goc.getWorldQuaternion(_qG); b.parent.getWorldQuaternion(_qP);
  b.quaternion.copy(_qP.invert().multiply(_q.copy(_qG).multiply(qC))); b.updateMatrixWorld(true);
}

/** tỉ lệ đoạn chi của bé trai (× chiều cao) – đo một lần ở tư thế nghỉ; phần khó đo (mũi, gót, đế…) lấy theo người giả của app (SAN_L) */
export function doTiLe(nv, H, SAN_L){
  const p = b => b.getWorldPosition(new THREE.Vector3()), X = nv.X, d = (a, b) => p(a).distanceTo(p(b)) / H;
  const giua = (a, b) => p(a).add(p(b)).multiplyScalar(0.5);
  const hong = giua(X.duiT[0], X.duiP[0]), vai = giua(X.canhTayT[0], X.canhTayP[0]);
  return { ...SAN_L, dui: d(X.duiT[0], X.duiT[1]), cang: d(X.cangChanT[0], X.cangChanT[1]), than: hong.distanceTo(vai) / H,
    tren: d(X.canhTayT[0], X.canhTayT[1]), duoi: d(X.cangTayT[0], X.cangTayT[1]),
    vai: p(X.canhTayT[0]).distanceTo(p(X.canhTayP[0])) / 2 / H, hong: p(X.duiT[0]).distanceTo(p(X.duiP[0])) / 2 / H, cao: 1 };
}

/** áp dáng sàn q. o = { Ls, H, ox (x app của tâm cảnh), oz } → trả P (vị trí khớp, đơn vị chiều cao) */
export function apDangSan(nv, q, o){
  const X = nv.X, P = khopSan(q, o.Ls), Z = P.z, H = o.H;
  const W = k => new THREE.Vector3(-(P[k][0] - o.ox) * H, P[k][1] * H, ((Z[k] || 0) + (o.oz || 0)) * H);
  // 1. về tư thế nghỉ
  for (const [b, qq] of nv.nghi) b.quaternion.copy(qq);
  X.hong.position.copy(nv.hongNghi); nv.goc.updateMatrixWorld(true);

  // 2. hệ trục thân
  const hip = W('hip'), sh = W('sh'), U = sh.clone().sub(hip).normalize();
  const gan = W('shN').sub(W('shF')); gan.addScaledVector(U, -gan.dot(U)); if (gan.lengthSq() < 1e-8) gan.set(0, 0, 1); gan.normalize();   // về phía vai GẦN máy
  const mat = W('nose').sub(W('ear'));                                         // hướng mặt
  // bé trai nghỉ: trái = +x, lên = +y, trước = +z → (trái × lên = trước). Bên gần là bên TRÁI nếu (gần × U) cùng phía mặt
  const ganLaTrai = gan.clone().cross(U).dot(mat) > 0;
  const T = ganLaTrai ? gan.clone() : gan.clone().negate(), F = T.clone().cross(U).normalize();
  const qThan = new THREE.Quaternion().setFromRotationMatrix(_m.makeBasis(T, U, F));
  datQC(nv, X.hong, qThan.clone().multiply(nv.nghiC.get(X.hong)));
  for (const b of X.chuoiThan) datQC(nv, b, qThan.clone().multiply(nv.nghiC.get(b)));
  // cổ – đầu: gật quanh trục ngang theo góc cổ so với thân (app: J.dau.rotation.x = (tr − n), + = cúi về phía trước)
  const gat = ((q.tr - (q.n ?? q.tr)) % 360 + 540) % 360 - 180, qDau = qThan.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), gat * Math.PI / 180));
  X.chuoiCo.forEach((b, i) => datQC(nv, b, qThan.clone().slerp(qDau, (i + 1) / (X.chuoiCo.length + 1)).multiply(nv.nghiC.get(b))));
  datQC(nv, X.dau, qDau.clone().multiply(nv.nghiC.get(X.dau)));

  // 3. tay chân: chi không dấu = phía gần máy
  for (const [h, S] of [['', ganLaTrai ? 'T' : 'P'], ['2', ganLaTrai ? 'P' : 'T']]){
    const vai = W(h ? 'shF' : 'shN'), hg = W(h ? 'hipF' : 'hipN'), el = W('el' + h), wr = W('wr' + h), kn = W('kn' + h), an = W('an' + h), tip = W('tip' + h);
    chiDoan(nv, X['canhTay' + S], el.clone().sub(vai)); chiDoan(nv, X['cangTay' + S], wr.clone().sub(el)); chiDoan(nv, X['banTay' + S], wr.clone().sub(el));
    chiDoan(nv, X['dui' + S], kn.clone().sub(hg)); chiDoan(nv, X['cangChan' + S], an.clone().sub(kn)); chiDoan(nv, X['ban' + S], tip.clone().sub(an));
    for (const ng of X['ngon' + S]) chiDoan(nv, ng, tip.clone().sub(an));
  }

  // 4. dời cả người: tâm hai khớp hông (đầu xương đùi) về đúng P.hip
  const hienTai = X.duiT[0].getWorldPosition(_v).add(X.duiP[0].getWorldPosition(_w)).multiplyScalar(0.5);
  const dich = hip.clone().sub(hienTai);
  const goc = X.hong.getWorldPosition(new THREE.Vector3()).add(dich);
  X.hong.position.copy(X.hong.parent.worldToLocal(goc)); X.hong.updateMatrixWorld(true);
  return P;
}
