// GHẾ cho động tác ngồi (HT_DT.ngoi – HT079 bàn chân khéo): tự dựng bằng khối hình học (không tài nguyên ngoài).
// Cách đặt chuẩn cho khách (thẻ HT079): ngồi ghế quay mặt về camera, hai bàn chân trên sàn, thấy rõ, không lưng ghế / bàn che chân.
//   'don'       ghế đẩu không lưng (mặc định)
//   'van_phong' ghế văn phòng: lưng ghế, tay vịn, trụ + chân sao – tay vịn / trụ che một phần đùi – gối, chân sao che quanh bàn chân (ca "có vật che")
//   'ban'       ghế đẩu + bàn thấp ngay trước bàn chân – mép bàn che bàn chân (ca "có vật che")
// Mặt ghế đặt ngay dưới khớp hông của dáng đang làm (hông chạm mặt ghế đúng độ cao theo mẫu; ap-dang.js đã giữ bàn chân trên sàn).
import * as THREE from 'three';

const GO = new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: 0.7 });
const NHUA = new THREE.MeshStandardMaterial({ color: 0x2b2d33, roughness: 0.55 });
const MAT_BAN = new THREE.MeshStandardMaterial({ color: 0xcfb894, roughness: 0.6 });
const hop = (w, h, d, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.castShadow = o.receiveShadow = true; return o; };
const tru = (r, h, m) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), m); o.castShadow = o.receiveShadow = true; return o; };

export const KIEU_GHE = ['don', 'van_phong', 'ban'];
const DAY = 0.04, MAT = 0.4;   // dày mặt ghế, cạnh mặt ghế (m)

export function taoGhe(scene){
  const g = new THREE.Group(); g.visible = false; scene.add(g);
  let kieu = null, caoDat = -1;
  function dung(k, cao){
    g.clear(); kieu = k; caoDat = cao;
    const mat = (m) => { const o = hop(MAT, DAY, MAT, m); o.position.y = cao - DAY / 2; g.add(o); };
    if (k === 'van_phong'){
      mat(NHUA);
      const tr = tru(0.03, cao - DAY - 0.08, NHUA); tr.position.y = (cao - DAY + 0.08) / 2; g.add(tr);
      for (let i = 0; i < 5; i++){ const a = i / 5 * Math.PI * 2 + Math.PI / 10, c = hop(0.04, 0.035, 0.32, NHUA); c.position.set(Math.sin(a) * 0.16, 0.06, Math.cos(a) * 0.16); c.rotation.y = a; g.add(c);
        const b = tru(0.025, 0.05, NHUA); b.position.set(Math.sin(a) * 0.31, 0.025, Math.cos(a) * 0.31); g.add(b); }
      const lung = hop(MAT * 0.95, 0.5, 0.05, NHUA); lung.position.set(0, cao + 0.33, -MAT / 2 - 0.02); g.add(lung);
      for (const s of [-1, 1]){   // tay vịn: trụ đứng + thanh ngang dọc theo đùi
        const d = hop(0.04, 0.22, 0.04, NHUA); d.position.set(s * (MAT / 2 + 0.03), cao + 0.11, 0); g.add(d);
        const n = hop(0.06, 0.035, 0.3, NHUA); n.position.set(s * (MAT / 2 + 0.03), cao + 0.23, 0.04); g.add(n);
      }
    } else {
      mat(GO);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]){ const c = hop(0.035, cao - DAY, 0.035, GO); c.position.set(sx * (MAT / 2 - 0.03), (cao - DAY) / 2, sz * (MAT / 2 - 0.03)); g.add(c); }
    }
    if (k === 'ban'){   // bàn thấp trước bàn chân: mặt bàn + tấm che phía trước
      const ban = new THREE.Group(), C = 0.17;
      const mb = hop(0.9, 0.03, 0.3, MAT_BAN); mb.position.y = C; ban.add(mb);
      const che = hop(0.9, C, 0.02, MAT_BAN); che.position.set(0, C / 2, 0.15); ban.add(che);
      ban.name = 'ban'; g.add(ban);
    }
  }
  return {
    /** đặt ghế theo dáng đang có của bé trai; null = ẩn */
    dat(nv, k){
      if (!k){ g.visible = false; return; }
      // khớp hông (đầu xương đùi) – mặt ghế dưới khớp hông ~0,085 m (mông + đùi), tâm mặt ghế lùi sau khớp hông
      const a = nv.X.duiT[0].getWorldPosition(new THREE.Vector3()), b = nv.X.duiP[0].getWorldPosition(new THREE.Vector3()), h = a.add(b).multiplyScalar(0.5);
      const goi = nv.X.duiT[1].getWorldPosition(new THREE.Vector3());
      const cao = Math.max(0.2, h.y - 0.085);
      if (k !== kieu || Math.abs(cao - caoDat) > 0.01) dung(k, +cao.toFixed(2));
      g.position.set(h.x, 0, h.z - 0.06);
      const ban = g.getObjectByName('ban'); if (ban) ban.position.z = goi.z - h.z + 0.06 + 0.3;   // mép bàn sát trước mũi chân
      g.visible = true;
    },
    an(){ g.visible = false; },
    get kieu(){ return g.visible ? kieu : null; },
  };
}
