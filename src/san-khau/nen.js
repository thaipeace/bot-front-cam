// NỀN – ảnh phòng thật từ webcam.
//  'chup'      (mặc định) đếm ngược rồi chụp 1 khung khi phòng trống → nền tĩnh; ánh sáng vẫn đọc trực tiếp từ webcam.
//  'truc-tiep' nền là webcam trực tiếp (chỉ dùng khi camera quay chỗ không có người – app sẽ thấy cả người trong khung).
//  'phong'     phòng dựng sẵn (không cần webcam – dùng khi máy không có camera / kiểm thử tự động).
import * as THREE from 'three';
import { timNguoi } from './tim-nguoi.js';

class LoiCoNguoi extends Error {}
// bộ tìm người lỗi (không nạp được mô hình…) thì báo lên console và coi như không có người – không chặn sân khấu
async function timNguoiAnToan(anh){
  try { return await timNguoi(anh); } catch (e) { console.warn('không kiểm được người trong nền: ' + e.message); return []; }
}

export async function moWebcam(){
  const s = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
  const v = document.createElement('video');
  v.srcObject = s; v.muted = true; v.playsInline = true;
  await v.play();
  await new Promise(r => v.videoWidth ? r() : v.addEventListener('loadedmetadata', r, { once: true }));
  return v;
}

/** cắt khung video kiểu "cover" về đúng tỉ lệ W×H, vẽ vào canvas */
export function veCover(ctx, v, W, H){
  const vw = v.videoWidth, vh = v.videoHeight, k = Math.max(W / vw, H / vh);
  const sw = W / k, sh = H / k;
  ctx.drawImage(v, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, W, H);
}

export async function dungNen(scene, { cheDo, W, H, demNguoc = 5, bao = () => {} }){
  if (cheDo !== 'phong'){
    try {
      const video = await moWebcam();
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d');
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      scene.background = tex;
      let tinh = false;
      const capNhat = () => { if (!tinh){ veCover(ctx, video, W, H); tex.needsUpdate = true; } };
      const nen = { loai: cheDo, video, capNhat, tex, coNguoi: false };
      if (cheDo === 'chup'){
        for (let i = demNguoc; i > 0; i--){ bao(`Rời khỏi khung camera… chụp nền sau ${i} giây`); capNhat(); await new Promise(r => setTimeout(r, 1000)); }
        // chụp xong phải KHÔNG còn người thật – không thì app nhận nhầm người thật
        for (let lan = 1; ; lan++){
          capNhat();
          const ng = await timNguoiAnToan(cv);
          if (!ng.length) break;
          if (lan >= 30) throw new LoiCoNguoi(`Ảnh nền vẫn còn người (điểm ${ng[0].diem}) sau ${lan} lần chụp – rời khỏi khung camera rồi chạy lại`);
          bao(`Còn người trong khung camera (điểm ${ng[0].diem}) – rời khỏi khung, chụp lại lần ${lan + 1}…`);
          await new Promise(r => setTimeout(r, 1500));
        }
        tinh = true; bao('Đã chụp nền phòng (không có người)');
      } else {
        // nền trực tiếp: kiểm định kỳ, báo lên (trangThai().nenCoNguoi)
        setInterval(async () => { nen.coNguoi = (await timNguoiAnToan(cv)).length > 0; }, 3000);
      }
      return nen;
    } catch (e) {
      if (e instanceof LoiCoNguoi) throw e;
      console.warn('không mở được webcam thật – dùng phòng dựng sẵn: ' + e.message);
    }
  }
  scene.background = new THREE.Color(0xd9d4cc);
  const tuong = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), new THREE.MeshStandardMaterial({ color: 0xe4ded3, roughness: 0.95 }));
  tuong.position.set(0, 3, -2.5); tuong.receiveShadow = true; scene.add(tuong);
  const san = new THREE.Mesh(new THREE.PlaneGeometry(14, 12), new THREE.MeshStandardMaterial({ color: 0xa88c6c, roughness: 0.8 }));
  san.rotation.x = -Math.PI / 2; san.receiveShadow = true; scene.add(san);
  return { loai: 'phong', video: null, capNhat(){}, tex: null };
}
