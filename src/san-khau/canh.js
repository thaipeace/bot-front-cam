// SÂN KHẤU – dựng người 3D, phát luồng hình 640×480 (đúng cỡ app xin) cho tab app qua WebRTC.
// GĐ 0: nhân vật tạm (three.js examples), đứng yên / vẫy tay / giơ tay; nền phòng trung tính hoặc webcam thật (?nen=webcam).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const q = new URLSearchParams(location.search);
const W = 640, H = 480;
const NV = q.get('nv') || 'Soldier';
const NEN = q.get('nen') || 'phong';
const CAO = +(q.get('cao') || 1.40);            // chiều cao nhân vật (m)
const tt = document.getElementById('tt');
const bao = s => { tt.textContent = s; };

// ---------- renderer + camera giống webcam laptop ----------
const cv = document.getElementById('cv');
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const FOV_DOC = 50;                             // webcam laptop 4:3 ~ 50° dọc
const camera = new THREE.PerspectiveCamera(FOV_DOC, W / H, 0.05, 50);
const CAM_CAO = 0.95;                           // laptop trên bàn

// ---------- nền ----------
async function dungNen(){
  if (NEN === 'webcam'){
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 } } });
      const v = document.createElement('video'); v.srcObject = s; v.muted = true; v.playsInline = true; await v.play();
      const tex = new THREE.VideoTexture(v); tex.colorSpace = THREE.SRGBColorSpace;
      scene.background = tex;
      return;
    } catch (e) { console.warn('không mở được webcam thật – dùng nền phòng', e); }
  }
  // phòng trung tính: tường + sàn
  scene.background = new THREE.Color(0xd9d4cc);
  const tuong = new THREE.Mesh(new THREE.PlaneGeometry(12, 5), new THREE.MeshStandardMaterial({ color: 0xe4ded3, roughness: 0.95 }));
  tuong.position.set(0, 2.5, -2.2); tuong.receiveShadow = true; scene.add(tuong);
  const san = new THREE.Mesh(new THREE.PlaneGeometry(12, 10), new THREE.MeshStandardMaterial({ color: 0xa88c6c, roughness: 0.8 }));
  san.rotation.x = -Math.PI / 2; san.receiveShadow = true; scene.add(san);
}

// ---------- ánh sáng ----------
scene.add(new THREE.HemisphereLight(0xfff6e8, 0x6b5a48, 1.6));
const den = new THREE.DirectionalLight(0xffffff, 2.2);
den.position.set(1.5, 3.2, 3.0); den.castShadow = true;
den.shadow.mapSize.set(1024, 1024);
Object.assign(den.shadow.camera, { left: -2, right: 2, top: 2.5, bottom: -0.5, near: 0.5, far: 10 });
scene.add(den);

// ---------- nhân vật ----------
const nv = { goc: null, xuong: {}, mixer: null, hanh: 'dung', t0: 0 };
const TEN_XUONG = ['Hips', 'Spine', 'Head', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand'];

async function napNhanVat(){
  const g = await new GLTFLoader().loadAsync(`/__bot/assets/tam/${NV}.glb`);
  const goc = g.scene;
  goc.traverse(o => {
    if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; }
    if (o.isBone) for (const t of TEN_XUONG) if (o.name.replace(/^mixamorig:?/, '') === t) nv.xuong[t] = o;
  });
  // co về đúng chiều cao, chân chạm sàn
  goc.updateMatrixWorld(true);
  const hop = new THREE.Box3().setFromObject(goc);
  const k = CAO / (hop.max.y - hop.min.y);
  goc.scale.setScalar(k);
  goc.updateMatrixWorld(true);
  const hop2 = new THREE.Box3().setFromObject(goc);
  goc.position.y -= hop2.min.y;
  if (q.get('xoay') !== null) goc.rotation.y = +q.get('xoay') * Math.PI / 180;
  else if (NV === 'Soldier') goc.rotation.y = Math.PI;     // Soldier quay mặt về −z
  scene.add(goc);
  nv.goc = goc;
  nv.mixer = new THREE.AnimationMixer(goc);
  const nghi = g.animations.find(a => /idle/i.test(a.name));
  if (nghi) nv.mixer.clipAction(nghi).play();
  return Object.keys(nv.xuong);
}

// đặt camera để trọn người (cả tay giơ cao) và người cao ~55% khung – luật H1–H3 của siroby-app
function datKhungHinh(){
  const caoTayGio = CAO * 1.25;                  // tay giơ thẳng trên đầu
  const vung = caoTayGio / 0.82;                 // chừa mép trên/dưới
  const d = vung / (2 * Math.tan(THREE.MathUtils.degToRad(FOV_DOC / 2)));
  const tamY = caoTayGio / 2 - 0.03;
  camera.position.set(0, CAM_CAO, d);
  camera.lookAt(0, tamY, 0);
  return d;
}

// ---------- tư thế đè lên hoạt ảnh: xoay xương theo HƯỚNG trong toạ độ thế giới ----------
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _qp = new THREE.Quaternion();
function chiXuong(xuong, con, huongTheGioi){
  xuong.updateMatrixWorld(true);
  xuong.getWorldPosition(_a); con.getWorldPosition(_b);
  _v.subVectors(_b, _a).normalize();
  const xoay = _q.setFromUnitVectors(_v, huongTheGioi.clone().normalize());
  // q_world_moi = xoay * q_world_cu → q_local_moi = q_parent^-1 * xoay * q_world_cu
  const qw = xuong.getWorldQuaternion(new THREE.Quaternion());
  xuong.parent.getWorldQuaternion(_qp);
  xuong.quaternion.copy(_qp.invert().multiply(xoay.multiply(qw)));
  xuong.updateMatrixWorld(true);
}
// hướng theo phía của nhân vật: ben = +1 (bên phải nhân vật = bên trái màn hình, x âm khi quay mặt về camera)
const huong = (ngang, len, truoc = 0) => new THREE.Vector3(ngang, len, truoc);

function apTuThe(t){
  const X = nv.xuong; if (!X.RightArm) return;
  const P = -1, T = +1;                          // phải nhân vật → x âm, trái → x dương
  if (nv.hanh === 'vay'){
    chiXuong(X.RightArm, X.RightForeArm, huong(P * 0.55, 0.8, 0.1));
    const a = Math.sin(t * 2 * Math.PI * 1.4) * 0.45;   // vẫy 1,4 lần/giây
    chiXuong(X.RightForeArm, X.RightHand, huong(P * (0.15 + a), 1, 0.1));
  } else if (nv.hanh === 'gioTay'){
    chiXuong(X.RightArm, X.RightForeArm, huong(P * 0.35, 1, 0)); chiXuong(X.RightForeArm, X.RightHand, huong(P * 0.25, 1, 0));
    chiXuong(X.LeftArm, X.LeftForeArm, huong(T * 0.35, 1, 0));   chiXuong(X.LeftForeArm, X.LeftHand, huong(T * 0.25, 1, 0));
  } else if (nv.hanh === 'vongNho'){
    // GĐ 0 – thử đếm: dang tay ngang vai, cổ tay vẽ vòng nhỏ (~1,05 giây/vòng như HT_DT.xoayVai)
    const g = t * 2 * Math.PI / 1.05, r = 0.32;
    const len = r * Math.sin(g), truoc = r * Math.cos(g);
    chiXuong(X.RightArm, X.RightForeArm, huong(P, len, truoc)); chiXuong(X.RightForeArm, X.RightHand, huong(P, len, truoc));
    chiXuong(X.LeftArm, X.LeftForeArm, huong(T, len, truoc));   chiXuong(X.LeftForeArm, X.LeftHand, huong(T, len, truoc));
  } else if (nv.hanh === 'dangTay'){
    chiXuong(X.RightArm, X.RightForeArm, huong(P, 0, 0)); chiXuong(X.RightForeArm, X.RightHand, huong(P, 0, 0));
    chiXuong(X.LeftArm, X.LeftForeArm, huong(T, 0, 0));   chiXuong(X.LeftForeArm, X.LeftHand, huong(T, 0, 0));
  }
}

// ---------- vòng lặp (setInterval – cửa sổ sân khấu có thể bị che, rAF sẽ dừng) ----------
const dongHo = new THREE.Clock();
let soKhung = 0;
function ve(){
  const dt = Math.min(dongHo.getDelta(), 0.1), t = dongHo.elapsedTime;
  if (nv.mixer) nv.mixer.update(dt);
  if (nv.goc){ nv.goc.updateMatrixWorld(true); apTuThe(t - nv.t0); }
  renderer.render(scene, camera);
  soKhung++;
}

// ---------- phát luồng cho tab app ----------
const luong = cv.captureStream(30);
const kenh = new BroadcastChannel('bot-front-cam');
const ketNoi = new Set();
kenh.onmessage = async e => {
  const m = e.data; if (!m || m.loai !== 'offer') return;
  const pc = new RTCPeerConnection({ iceServers: [] });
  ketNoi.add(pc);
  pc.addEventListener('connectionstatechange', () => { if (['closed', 'failed'].includes(pc.connectionState)) ketNoi.delete(pc); });
  for (const tr of luong.getVideoTracks()){
    const gui = pc.addTrack(tr, luong);
    const ts = gui.getParameters();
    ts.degradationPreference = 'maintain-resolution';
    ts.encodings = [{ ...(ts.encodings && ts.encodings[0] || {}), maxBitrate: 4_000_000, maxFramerate: 30 }];
    gui.setParameters(ts).catch(() => {});
  }
  await pc.setRemoteDescription({ type: 'offer', sdp: m.sdp });
  await pc.setLocalDescription(await pc.createAnswer());
  await new Promise(r => { if (pc.iceGatheringState === 'complete') return r(); pc.addEventListener('icegatheringstatechange', () => pc.iceGatheringState === 'complete' && r()); setTimeout(r, 2000); });
  kenh.postMessage({ loai: 'answer', id: m.id, sdp: pc.localDescription.sdp });
};

// ---------- điều khiển từ Node ----------
window.__botSanKhau = {
  san: false,
  lam(hanh){ nv.hanh = hanh; nv.t0 = dongHo.elapsedTime; return hanh; },
  trangThai(){ return { hanh: nv.hanh, soKhung, ketNoi: ketNoi.size, xuong: Object.keys(nv.xuong) }; },
};

(async () => {
  await dungNen();
  const xs = await napNhanVat();
  const d = datKhungHinh();
  setInterval(ve, 1000 / 30);
  window.__botSanKhau.san = true;
  bao(`${NV} · cao ${CAO} m · cách camera ${d.toFixed(2)} m · xương: ${xs.join(', ')}`);
})().catch(e => { bao('LỖI: ' + e.message); console.error(e); });
