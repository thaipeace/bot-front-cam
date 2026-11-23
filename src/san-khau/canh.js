// SÂN KHẤU – ghép: nền + ánh sáng từ webcam thật, bé trai 3D đứng ở khoảng cách tốt nhất, hậu kỳ giống webcam, phát cho tab app.
// Tham số URL: nv (tệp trong assets/avatar/, mặc định be-trai-11), nen (chup | truc-tiep | phong), cao (m), dem (giây đếm ngược chụp nền), hauky (0/1), hat
import * as THREE from 'three';
import { dungNen } from './nen.js';
import { dungAnhSang } from './anh-sang.js';
import { dungHauKy } from './camera-that.js';
import { napNhanVat, HANH } from './nhan-vat.js';
import { napMau } from '../dong-tac/mau.js';
import { apDang } from '../dong-tac/ap-dang.js';
import { taoThuVien } from '../dong-tac/thu-vien.js';
import { dungMat, apMat } from './mat.js';
import { datKhungHinh } from './khung-hinh.js';
import { batDauPhat } from './phat.js';

const q = new URLSearchParams(location.search);
const W = 640, H = 480;                                   // đúng cỡ siroby-app xin (vui/10-camera.js)
const NV = q.get('nv') || 'be-trai-11';
const NEN = q.get('nen') || 'chup';
const CAO = +(q.get('cao') || 1.40);
const HAT = +(q.get('hat') || 7);
const tt = document.getElementById('tt');
const bao = s => { tt.textContent = s; };

const cv = document.getElementById('cv');
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, preserveDrawingBuffer: true });
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping ?? THREE.ACESFilmicToneMapping;   // AgX: màu da trung thực hơn ACES
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, W / H, 0.05, 50);   // webcam laptop 4:3 ~ 50° dọc

// mặt phẳng hứng bóng – bóng đổ lên ảnh sàn thật
const hungBong = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: 0.32 }));
hungBong.rotation.x = -Math.PI / 2; hungBong.receiveShadow = true;

const anhSang = dungAnhSang(scene, renderer);
const hauKy = q.get('hauky') === '0' ? null : dungHauKy(renderer, W, H);
const tr = { nv: null, mat: null, hanh: 'dung', t0: 0, soKhung: 0, nen: null, khung: null };
const dongHo = new THREE.Clock();

const do_ = { ms: 0, khungGiay: 0, dem: 0, moc: performance.now(), tuThe: 0 };   // đo hiệu năng
function ve(){
  const b0 = performance.now();
  const t = dongHo.getElapsedTime();
  const nv = tr.nv;
  if (nv){
    apDang(nv, tr.tv.dang(t), tr.MAU);                       // động tác (hoặc đứng chờ) theo mẫu chuẩn của app
    if (tr.hanh !== 'dung') HANH[tr.hanh](nv, t - tr.t0);      // hành động thử cũ (vẫy tay…) đè lên tay
    if (tr.mat) apMat(tr.mat, t);
  }
  const b1 = performance.now();
  if (hauKy) hauKy.ve(scene, camera, t); else renderer.render(scene, camera);
  if (tr.phat) tr.phat.dayKhung();
  tr.soKhung++;
  const bay = performance.now();
  do_.ms = do_.ms * 0.9 + (bay - b0) * 0.1; do_.tuThe = do_.tuThe * 0.9 + (b1 - b0) * 0.1; do_.dem++;
  if (bay - do_.moc >= 1000){ do_.khungGiay = do_.dem; do_.dem = 0; do_.moc = bay; }
}

window.__botSanKhau = {
  san: false,
  /** động tác bài tập: { dongTac, soLan?, tocDo?, bienDo?, ben?, kieuSai?, giuGiay? } – không có soLan = làm đến khi dừng */
  lamDongTac(o){ tr.hanh = 'dung'; return tr.tv.batDau(o, dongHo.getElapsedTime()); },
  dungDongTac(){ tr.tv.dung(dongHo.getElapsedTime()); tr.hanh = 'dung'; },
  dongTac(){ return tr.tv.trangThai(dongHo.getElapsedTime()); },
  danhSachDongTac(){ return tr.tv.danhSach(); },
  /** hành động thử (vay, gioTay, dangTay, vongNho) hoặc tên động tác bài tập (làm đến khi dừng) */
  lam(hanh){
    if (tr.MAU.dongTac[hanh]) return this.lamDongTac({ dongTac: hanh });
    if (!HANH[hanh]) throw new Error('không có hành động ' + hanh); tr.tv.dung(dongHo.getElapsedTime()); tr.hanh = hanh; tr.t0 = dongHo.getElapsedTime(); return hanh;
  },
  trangThai(){
    return { hanh: tr.hanh, dongTac: tr.tv ? tr.tv.trangThai(dongHo.getElapsedTime()) : null, soKhung: tr.soKhung, khungGiay: do_.khungGiay, msVe: +do_.ms.toFixed(1), msTuThe: +do_.tuThe.toFixed(1), ketNoi: tr.phat ? tr.phat.soKetNoi() : 0, nen: tr.nen && tr.nen.loai, nenCoNguoi: !!(tr.nen && tr.nen.coNguoi),
      nv: NV, loaiXuong: tr.nv && tr.nv.loai, soXuong: tr.nv && tr.nv.soXuong, khung: tr.khung, anhSang: anhSang.so };
  },
  /** vị trí các xương (toạ độ thế giới) – soi lỗi */
  viTriXuong(ten){ const b = tr.nv.theoTen[ten]; if (!b) return null; const v = b.getWorldPosition(new THREE.Vector3()); return [v.x, v.y, v.z].map(n => +n.toFixed(4)); },
  /** nhân cường độ đèn (thử ảnh hưởng của ánh sáng lên nhận dáng) */
  /** đổi khoảng cách camera (m) – thử */
  datCach(m){ tr.khung = datKhungHinh(camera, tr.nv, CAO, m); return tr.khung; },
  datSang(k){ anhSang.troi.intensity = 1.5 * k; anhSang.den.intensity = 1.8 * k; return k; },
  thongKePhat(){ return tr.phat ? tr.phat.thongKe() : []; },
  /** liệt kê lưới + vật liệu – soi lỗi */
  luoi(){ const ds = []; tr.nv.goc.traverse(o => { if (o.isMesh){ const m = o.material; ds.push({ ten: o.name, dinh: o.geometry.attributes.position.count, hien: o.visible,
    vl: { ten: m.name, loai: m.type, truyen: m.transmission, ior: m.ior, phu: m.clearcoat, bong: m.specularIntensity, sheen: m.sheen, phat: m.emissive && m.emissive.getHexString(), kim: m.metalness, nham: m.roughness, mau: m.color && m.color.getHexString(), map: !!m.map, nmap: !!m.normalMap, trongSuot: m.transparent, alphaTest: m.alphaTest, mo: m.opacity, side: m.side } }); } }); return ds; },
  anLuoi(ten, hien){ tr.nv.goc.traverse(o => { if (o.isMesh && o.name.includes(ten)) o.visible = !!hien; }); },
  /** đặt camera soi cận (để chụp mặt) – null = trả về khung chuẩn */
  soiCan(o){ if (!o) return datKhungHinh(camera, tr.nv, CAO); camera.position.set(...o.tu); camera.lookAt(...o.nhin); camera.fov = o.fov || 20; camera.updateProjectionMatrix(); },
};

(async () => {
  tr.nen = await dungNen(scene, { cheDo: NEN, W, H, demNguoc: +(q.get('dem') || 5), bao });
  if (tr.nen.loai !== 'phong') scene.add(hungBong);
  const url = NV.includes('/') ? `/__bot/assets/${NV}.glb` : `/__bot/assets/avatar/${NV}.glb`;
  tr.nv = await napNhanVat(url, { cao: CAO });
  tr.MAU = await napMau();
  tr.tv = taoThuVien(tr.MAU, { hat: HAT });
  scene.add(tr.nv.goc);
  tr.mat = dungMat(tr.nv, { cuoi: +(q.get('cuoi') ?? 1), hat: HAT });
  tr.khung = datKhungHinh(camera, tr.nv, CAO, +(q.get('cach') || 0));
  if (tr.nen.video) { anhSang.capNhat(tr.nen.video); setInterval(() => { anhSang.capNhat(tr.nen.video); tr.nen.capNhat(); }, 500); }
  setInterval(ve, 1000 / 30);                              // setInterval – cửa sổ sân khấu bị che thì rAF dừng
  tr.phat = batDauPhat(cv, 30);
  window.__botSanKhau.san = true;
  bao(`${NV} · xương ${tr.nv.loai} (${tr.nv.soXuong}) · cao ${CAO} m · cách camera ${tr.khung.cach} m · nền ${tr.nen.loai}`);
})().catch(e => { bao('LỖI: ' + e.message); console.error(e); });
