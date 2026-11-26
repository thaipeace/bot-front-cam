// ÁP DÁNG – đưa dáng mẫu P (cùng định dạng MAU3D của siroby-app) lên bộ xương bé trai.
//  - hông, thân (chia đều cho chuỗi xương sống), cổ + đầu: XOAY theo góc của mẫu (Euler 'YXZ' như app)
//  - tay, chân, bàn chân, bàn tay: theo HƯỚNG đoạn khớp do khop() tính (không phụ thuộc tỉ lệ cơ thể)
//  - hông dịch ngang / trước sau theo mẫu, rồi hạ / nâng cả người để chân chạm sàn (cổ chân hoặc mũi chân thấp nhất = như lúc đứng)
//    – trừ lúc mẫu nhấc CẢ HAI chân (bật nhảy): cả người lên đúng bằng khoảng chân thấp nhất rời sàn trong mẫu
//  - P.xa (đi lùi / bước tới / bật xa): cả người lùi xa (+) / tới gần (−) camera, cùng tỉ lệ ảnh như người giả của app (mauLmGia: 1 / (1 + 0,3·xa))
import * as THREE from 'three';
import { khop, latGuong } from './mau.js';
import { chiDoan } from '../san-khau/nhan-vat.js';

const D2R = Math.PI / 180;
const CACH_CAM = 2.2;   // m – bé trai đứng cách camera ~2,2 m (khung-hinh.js); lùi Δ m thì ảnh nhỏ đi CACH / (CACH + Δ) = 1 / (1 + 0,3·xa) → Δ = 0,3·xa·CACH
const _qG = new THREE.Quaternion(), _qP = new THREE.Quaternion(), _qI = new THREE.Quaternion(), _q = new THREE.Quaternion();
const _v = new THREE.Vector3(), _w = new THREE.Vector3();
const quatEuler = o => new THREE.Quaternion().setFromEuler(new THREE.Euler((o.gap ?? o.gat ?? 0) * D2R, (o.xoay || 0) * D2R, (o.nghieng || 0) * D2R, 'YXZ'));
const V = a => new THREE.Vector3(a[0], a[1], a[2]);

/** đặt hướng xương theo toạ độ nhân vật: q (goc-space) */
function datQC(nv, b, qC){
  nv.goc.getWorldQuaternion(_qG);
  b.parent.getWorldQuaternion(_qP);
  b.quaternion.copy(_qP.invert().multiply(_q.copy(_qG).multiply(qC)));
  b.updateMatrixWorld(true);
}

export function apDang(nv, P, MAU){
  // App SOI GƯƠNG ảnh camera (vui/10-camera.js: x = 1 − p.x): tay trái của bé hiện bên TRÁI màn – đúng phía tay[0] của mẫu (người giả: điểm 11 = tay[0]).
  // Bé trai đứng quay mặt về camera thì bên trái màn (chưa lật) là tay PHẢI của bé → lật gương dáng một lần ở đây để app thấy đúng tay / chân như mẫu
  // (26/11: JAB bị "TAY TRƯỚC!" 0/3 vì bé đấm tay kia; lật gương → 3/3).
  P = latGuong(P);
  const X = nv.X, J = khop(P, MAU.MG, MAU.MAU_KT);
  // 1. về tư thế nghỉ
  for (const [b, q] of nv.nghi) b.quaternion.copy(q);
  X.hong.position.copy(nv.hongNghi);
  nv.goc.updateMatrixWorld(true);

  // 2. hông + thân + cổ / đầu
  const qH = quatEuler(P.hong), qT = quatEuler(P.than), qD = quatEuler(P.dau);
  datQC(nv, X.hong, qH.clone().multiply(nv.nghiC.get(X.hong)));
  const n = X.chuoiThan.length;
  X.chuoiThan.forEach((b, i) => datQC(nv, b, qH.clone().multiply(_qI.identity().slerp(qT, (i + 1) / n)).multiply(nv.nghiC.get(b))));
  const qHT = qH.clone().multiply(qT), m = X.chuoiCo.length;
  X.chuoiCo.forEach((b, i) => datQC(nv, b, qHT.clone().multiply(_qI.identity().slerp(qD, (i + 1) / (m + 1))).multiply(nv.nghiC.get(b))));
  datQC(nv, X.dau, qHT.clone().multiply(qD).multiply(nv.nghiC.get(X.dau)));

  // 3. dịch hông ngang / trước sau (đơn vị mẫu → mét theo chiều cao hông)
  const k = nv.nghiThe.caoHong / MAU.MG.dung;
  const xa = 0.3 * Math.max(-1.6, P.xa || 0) * CACH_CAM;
  const hongThe = nv.nghiThe.hong.clone().add(_v.set(P.hong.x * MAU.MG.sx * k, 0, P.hong.z * MAU.MG.sl * k - xa).applyQuaternion(nv.goc.getWorldQuaternion(_qG)));
  X.hong.position.copy(X.hong.parent.worldToLocal(hongThe.clone()));
  X.hong.updateMatrixWorld(true);

  // 4. tay chân theo hướng khớp (dáng đã lật gương ở đầu hàm). i = 0: bên TRÁI ảnh camera chưa lật = bên PHẢI bé trai
  for (const i of [0, 1]){
    const S = i ? 'T' : 'P', c = J.chan[i], t = J.tay[i];
    chiDoan(nv, X['dui' + S], V(c.goi).sub(V(c.hang)));
    chiDoan(nv, X['cangChan' + S], V(c.co).sub(V(c.goi)));
    chiDoan(nv, X['ban' + S], V(c.mui).sub(V(c.co)));
    // ngón chân: nằm ngang theo hướng bàn chân (kiễng gót thì ngón gập lên, vẫn trên sàn – như người thật)
    const truoc = V(c.mui).sub(V(c.co)); truoc.y = 0;
    if (truoc.lengthSq() > 1e-6) for (const ng of X['ngon' + S]) chiDoan(nv, ng, truoc.clone().setY(-0.08));
    // mẫu muốn tay THẲNG (cổ tay cách vai ≥ 95 % chiều dài tay) → duỗi thẳng hẳn: app nhắc "DUỖI THẲNG TAY" khi khuỷu hơi gập
    const vc = V(t.co).sub(V(t.vai));
    if (vc.length() >= 0.95 * (MAU.MG.ua + MAU.MG.fa)){
      chiDoan(nv, X['canhTay' + S], vc); chiDoan(nv, X['cangTay' + S], vc); chiDoan(nv, X['banTay' + S], vc);
    } else {
      chiDoan(nv, X['canhTay' + S], V(t.khuyu).sub(V(t.vai)));
      chiDoan(nv, X['cangTay' + S], V(t.co).sub(V(t.khuyu)));
      chiDoan(nv, X['banTay' + S], V(t.co).sub(V(t.khuyu)));
    }
  }

  // 5. chân chạm sàn: điểm thấp nhất (cổ chân / mũi chân, so với lúc đứng) về đúng độ cao lúc đứng
  const y = b => b.getWorldPosition(_w).y, N = nv.nghiThe;
  const lech = Math.min(y(X.banT[0]) - N.coT, y(X.banP[0]) - N.coP, y(X.banT[1]) - N.muiT, y(X.banP[1]) - N.muiP);
  // mẫu nhấc cả hai chân (bật nhảy): chân thấp nhất trong MẪU cách sàn bao nhiêu (so với lúc đứng: cổ chân y = 0, mũi chân y = −0,16) thì bé trai lên bấy nhiêu
  const bay = Math.max(0, Math.min(J.chan[0].co[1], J.chan[1].co[1], J.chan[0].mui[1] + 0.16, J.chan[1].mui[1] + 0.16)) * k;
  hongThe.y -= lech - bay;
  X.hong.position.copy(X.hong.parent.worldToLocal(hongThe.clone()));
  X.hong.updateMatrixWorld(true);
  return J;
}
