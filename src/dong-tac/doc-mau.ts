// ĐỌC MẪU ĐỘNG TÁC (phía Node) – gộp mọi tệp src/dong-tac/mau/*.json (cong-cu/lay-mau3d.ts ghi theo nhóm) thành một bộ:
//   { MAU_DUNG, MAU_KT, MG, GIAY_MUC, dongTac: { id: … }, mau: { tên mẫu: … }, tep: { id: tệp } }
// Sân khấu nạp bản gộp qua /__bot/dong-tac/mau/_tat-ca.json (src/trinh-duyet/mo-chrome.ts).
// Động tác app có nhưng bot chưa làm được: src/dong-tac/chua-ho-tro.json (cũng do lay-mau3d.ts ghi).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const THU_MUC_MAU = path.join(GOC, 'src/dong-tac/mau');
export const TEP_CHUA_HO_TRO = path.join(GOC, 'src/dong-tac/chua-ho-tro.json');

export type BoMau = { MAU_DUNG: any; MAU_KT: any; MG: any; GIAY_MUC?: number[]; nguon?: string; trich?: string; dongTac: Record<string, any>; mau: Record<string, any>; tep: Record<string, string> };

let daDoc: BoMau | null = null;
export function docMau(thuMuc = THU_MUC_MAU): BoMau {
  if (daDoc && thuMuc === THU_MUC_MAU) return daDoc;
  const tep = fs.readdirSync(thuMuc).filter(f => f.endsWith('.json')).sort();
  if (!tep.length) throw new Error(`không có tệp mẫu trong ${thuMuc} – chạy: npx tsx cong-cu/lay-mau3d.ts`);
  let bo: BoMau | null = null;
  for (const f of tep) {
    const d = JSON.parse(fs.readFileSync(path.join(thuMuc, f), 'utf8'));
    if (!d.dongTac) continue;
    bo ??= { MAU_DUNG: d.MAU_DUNG, MAU_KT: d.MAU_KT, MG: d.MG, GIAY_MUC: d.GIAY_MUC, nguon: d.nguon, trich: d.trich, dongTac: {}, mau: {}, tep: {} };
    for (const [id, x] of Object.entries<any>(d.dongTac)) {
      if (bo.dongTac[id]) throw new Error(`động tác ${id} có ở cả ${bo.tep[id]} và ${f}`);
      bo.dongTac[id] = x; bo.tep[id] = f;
    }
    Object.assign(bo.mau, d.mau);
  }
  if (!bo) throw new Error(`không tệp nào trong ${thuMuc} có "dongTac"`);
  if (thuMuc === THU_MUC_MAU) daDoc = bo;
  return bo;
}

/** tên app hiện → id (tu_dong). Hai id cùng tên: lấy id đầu (lay-mau3d.ts in cảnh báo TÊN TRÙNG) */
export function banDoTen(bo: BoMau): Map<string, string> {
  const m = new Map<string, string>();
  for (const [id, d] of Object.entries<any>(bo.dongTac)) if (!m.has(d.ten)) m.set(d.ten, id);
  return m;
}

export type ChuaHoTro = { trich?: string; nguon?: string; lyDo: Record<string, { mo: string; viec: string; ds: { id: string; ten: string; kieu: string; mau: string }[] }> };
export function docChuaHoTro(): ChuaHoTro | null {
  try { return JSON.parse(fs.readFileSync(TEP_CHUA_HO_TRO, 'utf8')); } catch { return null; }
}
/** id → lý do chưa hỗ trợ (để báo lỗi kịch bản dễ hiểu) */
export function lyDoChuaHoTro(id: string): string | null {
  const c = docChuaHoTro(); if (!c) return null;
  for (const l of Object.values(c.lyDo)) if (l.ds.some(x => x.id === id)) return l.mo;
  return null;
}
