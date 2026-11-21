// KHUNG HÌNH – đặt camera ảo sao cho trọn người kể cả tay giơ thẳng, người cao ~55–60% khung, chân cách mép dưới ≥ 2%.
// Luật H1–H3 của siroby-app (tai-lieu/LUAT-HINH-ANH-CAMERA.md).
import * as THREE from 'three';

export const CAM_CAO = 0.95;           // laptop trên bàn

export function datKhungHinh(camera, nv, cao, cachEp = 0){
  const fov = THREE.MathUtils.degToRad(camera.fov = 50);
  camera.updateProjectionMatrix();
  const caoTayGio = cao * 1.27;                          // cổ tay giơ thẳng trên đầu ≈ 1,27 × chiều cao
  const vung = caoTayGio / 0.86;                         // chừa ~7% mép trên + dưới
  const cach = cachEp || vung / (2 * Math.tan(fov / 2));
  const tamY = caoTayGio / 2 - 0.04;
  camera.position.set(0, CAM_CAO, cach);
  camera.lookAt(0, tamY, 0);
  return { cach: +cach.toFixed(2), tyLeNguoi: +(cao / vung).toFixed(2) };
}
