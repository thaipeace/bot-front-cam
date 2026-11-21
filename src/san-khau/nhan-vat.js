// NHÂN VẬT – nạp GLB, nhận bộ xương (MPFB default / MPFB game_engine / Mixamo), tư thế thủ tục, dáng chờ tự nhiên.
// Mọi tư thế đặt bằng HƯỚNG đoạn xương trong toạ độ nhân vật: x+ = bên TRÁI nhân vật (bên phải màn hình), y+ = lên, z+ = về phía camera.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// tên xương theo từng bộ: [xương, xương con (đầu mút)]
const BO_XUONG = {
  mpfb: {
    hong: 'root', than: 'spine03', nguc: 'spine01', co: 'neck01', dau: 'head',
    canhTay: s => [`upperarm01${s}`, `lowerarm01${s}`], cangTay: s => [`lowerarm01${s}`, `wrist${s}`],
    dui: s => [`upperleg01${s}`, `lowerleg01${s}`], cangChan: s => [`lowerleg01${s}`, `foot${s}`], ben: { T: 'L', P: 'R' },
    chuoiThan: ['spine05', 'spine04', 'spine03', 'spine02', 'spine01'], chuoiCo: ['neck01', 'neck02', 'neck03'],
    ban: s => [`foot${s}`, `toe3-1${s}`], banTay: s => [`wrist${s}`, `finger3-1${s}`],
  },
  ge: {
    hong: 'pelvis', than: 'spine_01', nguc: 'spine_03', co: 'neck_01', dau: 'head',
    canhTay: s => [`upperarm_${s}`, `lowerarm_${s}`], cangTay: s => [`lowerarm_${s}`, `hand_${s}`],
    dui: s => [`thigh_${s}`, `calf_${s}`], cangChan: s => [`calf_${s}`, `foot_${s}`], ben: { T: 'l', P: 'r' },
    chuoiThan: ['spine_01', 'spine_02', 'spine_03'], chuoiCo: ['neck_01'],
    ban: s => [`foot_${s}`, `ball_${s}`], banTay: s => [`hand_${s}`, `middle_01_${s}`],
  },
  mixamo: {
    hong: 'Hips', than: 'Spine', nguc: 'Spine2', co: 'Neck', dau: 'Head',
    canhTay: s => [`${s}Arm`, `${s}ForeArm`], cangTay: s => [`${s}ForeArm`, `${s}Hand`],
    dui: s => [`${s}UpLeg`, `${s}Leg`], cangChan: s => [`${s}Leg`, `${s}Foot`], ben: { T: 'Left', P: 'Right' },
    chuoiThan: ['Spine', 'Spine1', 'Spine2'], chuoiCo: ['Neck'],
    ban: s => [`${s}Foot`, `${s}ToeBase`], banTay: s => [`${s}Hand`, `${s}HandMiddle1`],
  },
};

// MPFB xuất mọi vật liệu ở chế độ BLEND (trong suốt) → sai thứ tự vẽ (thấy xuyên mặt vào trong đầu, da lộ qua quần).
// Lưới đặc vẽ đặc; tóc / lông mày / lông mi cắt theo alpha (alphaTest) – không cần sắp thứ tự.
const CAT_ALPHA = /high-poly|low-poly|eyebrow|eyelash|short0|hair|bob|braid|ponytail|afro|long0/i;
function suaVatLieu(o){
  const ds = Array.isArray(o.material) ? o.material : [o.material];
  for (const m of ds){
    m.transparent = false; m.depthWrite = true; m.opacity = 1;
    if (CAT_ALPHA.test(o.name) || CAT_ALPHA.test(m.name)){ m.alphaTest = 0.45; m.side = THREE.DoubleSide; }
    else { m.alphaTest = 0; m.side = THREE.FrontSide; }
    m.needsUpdate = true;
  }
}

export async function napNhanVat(url, { cao }){
  const g = await new GLTFLoader().loadAsync(url);
  const goc = new THREE.Group();
  const mo = g.scene;
  goc.add(mo);
  const theoTen = {};
  const morph = [];
  mo.traverse(o => {
    if (o.isMesh || o.isSkinnedMesh){
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; if (o.morphTargetDictionary) morph.push(o);
      suaVatLieu(o);
    }
    if (o.isBone) theoTen[o.name.replace(/^mixamorig:?/, '')] = o;
  });
  const loai = theoTen['upperarm01L'] ? 'mpfb' : theoTen['upperarm_l'] ? 'ge' : theoTen['LeftArm'] ? 'mixamo' : null;
  if (!loai) throw new Error('không nhận ra bộ xương: ' + Object.keys(theoTen).slice(0, 12).join(', '));
  const B = BO_XUONG[loai], x = n => { const b = theoTen[n]; if (!b) throw new Error(`thiếu xương ${n} (${loai})`); return b; };
  const doan = (f, s) => f(s).map(x);
  const X = {
    hong: x(B.hong), than: x(B.than), nguc: x(B.nguc), co: x(B.co), dau: x(B.dau),
    canhTayT: doan(B.canhTay, B.ben.T), cangTayT: doan(B.cangTay, B.ben.T), canhTayP: doan(B.canhTay, B.ben.P), cangTayP: doan(B.cangTay, B.ben.P),
    duiT: doan(B.dui, B.ben.T), cangChanT: doan(B.cangChan, B.ben.T), duiP: doan(B.dui, B.ben.P), cangChanP: doan(B.cangChan, B.ben.P),
    chuoiThan: B.chuoiThan.map(x), chuoiCo: B.chuoiCo.map(x),
    // gốc từng ngón chân [xương, con] – giữ ngón nằm trên sàn khi kiễng gót (bộ MPFB có 5 ngón; bộ khác: không có)
    ngonT: loai === 'mpfb' ? [1, 2, 3, 4, 5].map(n => [x(`toe${n}-1L`), x(`toe${n}-2L`)]) : [],
    ngonP: loai === 'mpfb' ? [1, 2, 3, 4, 5].map(n => [x(`toe${n}-1R`), x(`toe${n}-2R`)]) : [],
    banT: doan(B.ban, B.ben.T), banP: doan(B.ban, B.ben.P), banTayT: doan(B.banTay, B.ben.T), banTayP: doan(B.banTay, B.ben.P),
  };

  // quay mặt về camera (+z): khi đó vai TRÁI của nhân vật nằm ở x+ (bên phải màn hình)
  goc.updateMatrixWorld(true);
  const vT = X.canhTayT[0].getWorldPosition(new THREE.Vector3()), vP = X.canhTayP[0].getWorldPosition(new THREE.Vector3());
  const ngang = vT.sub(vP); ngang.y = 0;                                     // vai phải → vai trái
  mo.rotation.y = Math.atan2(ngang.z, ngang.x);                              // xoay vector này về +x
  goc.updateMatrixWorld(true);

  // co về đúng chiều cao, chân chạm sàn
  const hop = new THREE.Box3().setFromObject(mo);
  const k = cao / (hop.max.y - hop.min.y);
  goc.scale.setScalar(k); goc.updateMatrixWorld(true);
  goc.position.y -= new THREE.Box3().setFromObject(goc).min.y;
  goc.updateMatrixWorld(true);

  const nghi = new Map(); for (const b of Object.values(theoTen)) nghi.set(b, b.quaternion.clone());
  const hongNghi = X.hong.position.clone();
  // tư thế nghỉ theo TOẠ ĐỘ NHÂN VẬT (goc): hướng từng xương, vị trí hông, độ cao cổ chân / mũi chân – cho retarget (src/dong-tac/ap-dang.js)
  const qGocNguoc = goc.getWorldQuaternion(new THREE.Quaternion()).invert();
  const nghiC = new Map(); for (const b of Object.values(theoTen)) nghiC.set(b, qGocNguoc.clone().multiply(b.getWorldQuaternion(new THREE.Quaternion())));
  const vt = b => b.getWorldPosition(new THREE.Vector3());
  const nghiThe = { hong: vt(X.hong), coT: vt(X.banT[0]).y, coP: vt(X.banP[0]).y, muiT: vt(X.banT[1]).y, muiP: vt(X.banP[1]).y,
    caoHong: (vt(X.duiT[0]).y + vt(X.duiP[0]).y) / 2 - Math.min(vt(X.banT[0]).y, vt(X.banP[0]).y) };
  // mặt vui tươi nếu GLB có shape key cười
  for (const m of morph) for (const [ten, i] of Object.entries(m.morphTargetDictionary)) if (/smile|cuoi|happy/i.test(ten)) m.morphTargetInfluences[i] = 0.6;

  return { goc, X, loai, theoTen, nghi, hongNghi, nghiC, nghiThe, soXuong: Object.keys(theoTen).length };
}

// ---------- đặt hướng đoạn xương ----------
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _v = new THREE.Vector3(), _d = new THREE.Vector3();
const _q = new THREE.Quaternion(), _qw = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _qg = new THREE.Quaternion();
/** xoay đoạn [xương, con] để hướng tới `huong` (toạ độ NHÂN VẬT) */
export function chiDoan(nv, [xuong, con], huong){
  xuong.updateMatrixWorld(true);
  xuong.getWorldPosition(_a); con.getWorldPosition(_b);
  _v.subVectors(_b, _a).normalize();
  nv.goc.getWorldQuaternion(_qg);
  _d.copy(huong).normalize().applyQuaternion(_qg);
  _q.setFromUnitVectors(_v, _d);
  xuong.getWorldQuaternion(_qw);
  xuong.parent.getWorldQuaternion(_qp);
  xuong.quaternion.copy(_qp.invert().multiply(_q.multiply(_qw)));
  xuong.updateMatrixWorld(true);
}
/** xoay thêm một xương quanh trục toạ độ nhân vật */
export function xoayThem(nv, xuong, truc, goc){
  nv.goc.getWorldQuaternion(_qg);
  const tw = truc.clone().normalize().applyQuaternion(_qg);
  const qx = new THREE.Quaternion().setFromAxisAngle(tw, goc);
  xuong.getWorldQuaternion(_qw); xuong.parent.getWorldQuaternion(_qp);
  xuong.quaternion.copy(_qp.invert().multiply(qx.multiply(_qw)));
  xuong.updateMatrixWorld(true);
}

export const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const TRUC_X = V(1, 0, 0), TRUC_Y = V(0, 1, 0), TRUC_Z = V(0, 0, 1);

// ---------- hành động thử (GĐ 0 – 1). Động tác bài tập thật ở GĐ 2. ----------
export const HANH = {
  dung(){},
  vay(nv, t){
    chiDoan(nv, nv.X.canhTayP, V(-0.55, 0.8, 0.1));
    const a = Math.sin(t * 2 * Math.PI * 1.4) * 0.45;
    chiDoan(nv, nv.X.cangTayP, V(-(0.15 + a), 1, 0.1));
  },
  gioTay(nv){
    chiDoan(nv, nv.X.canhTayP, V(-0.35, 1)); chiDoan(nv, nv.X.cangTayP, V(-0.25, 1));
    chiDoan(nv, nv.X.canhTayT, V(0.35, 1)); chiDoan(nv, nv.X.cangTayT, V(0.25, 1));
  },
  dangTay(nv){
    chiDoan(nv, nv.X.canhTayP, V(-1, 0)); chiDoan(nv, nv.X.cangTayP, V(-1, 0));
    chiDoan(nv, nv.X.canhTayT, V(1, 0)); chiDoan(nv, nv.X.cangTayT, V(1, 0));
  },
  vongNho(nv, t){
    const g = t * 2 * Math.PI / 1.05, r = 0.32, len = r * Math.sin(g), truoc = r * Math.cos(g);
    chiDoan(nv, nv.X.canhTayP, V(-1, len, truoc)); chiDoan(nv, nv.X.cangTayP, V(-1, len, truoc));
    chiDoan(nv, nv.X.canhTayT, V(1, len, truoc)); chiDoan(nv, nv.X.cangTayT, V(1, len, truoc));
  },
};
