// MẶT – vui tươi: cười mỉm + nheo má nhẹ, chớp mắt tự nhiên (3–5 giây / lần, ~150 ms).
// Dùng morph target kiểu ARKit (gói faceunits01 của MakeHuman, CC0) do cong-cu/dung-be-trai.py xuất kèm GLB.
const CUOI = { mouthSmileLeft: 0.55, mouthSmileRight: 0.55, cheekSquintLeft: 0.25, cheekSquintRight: 0.25 };
const CHOP = ['eyeBlinkLeft', 'eyeBlinkRight'];

export function dungMat(nv, { cuoi = 1, hat = 7 } = {}){
  const luoi = [];
  nv.goc.traverse(o => { if (o.isMesh && o.morphTargetDictionary && 'mouthSmileLeft' in o.morphTargetDictionary) luoi.push(o); });
  if (!luoi.length) return null;
  return { luoi, cuoi, lanChop: 2, chop: -1, hat };
}

const datKhoi = (m, ten, gt) => { for (const o of m.luoi){ const i = o.morphTargetDictionary[ten]; if (i !== undefined) o.morphTargetInfluences[i] = gt; } };
// giả ngẫu nhiên theo hạt – chạy lại cùng hạt ra cùng nhịp chớp
const ngauNhien = (n, hat) => { const x = Math.sin(n * 12.9898 + hat * 78.233) * 43758.5453; return x - Math.floor(x); };

export function apMat(m, t){
  if (!m) return;
  // cười "thở" nhẹ theo thời gian – không đơ
  const song = 1 + 0.12 * Math.sin(t * 0.7);
  for (const [ten, gt] of Object.entries(CUOI)) datKhoi(m, ten, Math.min(1, gt * m.cuoi * song));
  if (t > m.lanChop){ m.chop = t; m.lanChop = t + 3 + 2 * ngauNhien(Math.floor(t), m.hat); }
  const k = Math.max(0, 1 - Math.abs(t - m.chop - 0.075) / 0.075);     // 0 → 1 → 0 trong 150 ms
  for (const ten of CHOP) datKhoi(m, ten, k);
}
