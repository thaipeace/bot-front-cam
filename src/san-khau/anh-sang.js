// ÁNH SÁNG – lấy từ webcam thật: độ sáng chung, màu trên / dưới, hướng nguồn sáng chính, bản đồ môi trường.
import * as THREE from 'three';
import { veCover } from './nen.js';

const SW = 32, SH = 24;
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };

export function dungAnhSang(scene, renderer){
  const troi = new THREE.HemisphereLight(0xfff6e8, 0x6b5a48, 1.6);
  const den = new THREE.DirectionalLight(0xffffff, 2.2);
  den.position.set(1.5, 3.2, 3.0);
  den.castShadow = true;
  den.shadow.mapSize.set(1024, 1024);
  den.shadow.radius = 6;
  Object.assign(den.shadow.camera, { left: -2, right: 2, top: 2.5, bottom: -0.5, near: 0.5, far: 12 });
  scene.add(troi, den, den.target);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const mau = document.createElement('canvas'); mau.width = SW; mau.height = SH;
  const mctx = mau.getContext('2d', { willReadFrequently: true });
  const envCv = document.createElement('canvas'); envCv.width = 256; envCv.height = 128;
  const ectx = envCv.getContext('2d');
  let envCu = null, lanEnv = 0;
  const so = { do_sang: 0.5, tren: [1, 1, 1], duoi: [1, 1, 1], huongX: 0 };

  /** đọc webcam, chỉnh đèn. Gọi ~2 lần / giây. */
  function capNhat(video, nhan = 1){
    if (!video || !video.videoWidth) return so;
    veCover(mctx, video, SW, SH);
    const d = mctx.getImageData(0, 0, SW, SH).data;
    const tren = [0, 0, 0], duoi = [0, 0, 0], cot = new Float32Array(SW);
    let tong = 0;
    for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++){
      const i = (y * SW + x) * 4, r = lin(d[i]), g = lin(d[i + 1]), b = lin(d[i + 2]);
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      tong += l; cot[x] += l;
      const dich = y < SH / 2 ? tren : duoi; dich[0] += r; dich[1] += g; dich[2] += b;
    }
    const n = SW * SH, nua = n / 2;
    so.do_sang = tong / n;
    so.tren = tren.map(c => c / nua); so.duoi = duoi.map(c => c / nua);
    // hướng sáng ngang: trọng tâm độ sáng các cột (−1 trái … +1 phải của ảnh)
    let w = 0, cx = 0; for (let x = 0; x < SW; x++){ const k = cot[x] ** 2; w += k; cx += k * (x / (SW - 1) * 2 - 1); }
    so.huongX = w ? cx / w : 0;

    const chuan = c => { const m = Math.max(...c, 1e-4); return new THREE.Color(c[0] / m, c[1] / m, c[2] / m); };
    troi.color.copy(chuan(so.tren)); troi.groundColor.copy(chuan(so.duoi)).multiplyScalar(0.7);
    // phòng tối → đèn yếu hơn; giữ trong khoảng hợp lý để người vẫn rõ cho mắt camera
    const k = THREE.MathUtils.clamp(so.do_sang / 0.18, 0.35, 1.6) * nhan;
    troi.intensity = 1.5 * k;
    den.intensity = 1.8 * k;
    den.color.copy(chuan(so.tren));
    den.position.set(so.huongX * 3, 3.2, 3.0);
    renderer.toneMappingExposure = THREE.MathUtils.clamp(0.9 + (0.18 - so.do_sang) * 0.8, 0.75, 1.25);

    // bản đồ môi trường từ ảnh phòng (5 giây / lần) – da và quần áo phản chiếu đúng màu phòng
    const bay = performance.now();
    if (bay - lanEnv > 5000){
      lanEnv = bay;
      veCover(ectx, video, 256, 128);
      const t = new THREE.CanvasTexture(envCv); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;
      const rt = pmrem.fromEquirectangular(t); t.dispose();
      scene.environment = rt.texture; scene.environmentIntensity = 0.6;
      if (envCu) envCu.dispose(); envCu = rt;
    }
    return so;
  }
  return { troi, den, capNhat, so };
}
