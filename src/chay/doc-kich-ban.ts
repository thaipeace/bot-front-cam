// ĐỌC KỊCH BẢN – YAML → danh sách case đã kiểm. Lỗi báo kèm tệp:dòng để Claude bên siroby-app sửa nhanh.
import fs from 'node:fs';
import path from 'node:path';
import { parseDocument, LineCounter, isNode } from 'yaml';
import { fileURLToPath } from 'node:url';
import { KichBan, LENH, type Buoc, type TenLenh } from './schema.js';
// @ts-ignore – module JS dùng chung với sân khấu
import { KIEU_SAI } from '../dong-tac/kieu-sai.js';
import { docMau, lyDoChuaHoTro } from '../dong-tac/doc-mau.js';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DONG_TAC: string[] = Object.keys(docMau().dongTac);
/** kiểm tên động tác + kiểu sai có trong thư viện */
function kiemDongTac(dt: string, sai?: string): string | null {
  if (!DONG_TAC.includes(dt)){
    const ly = lyDoChuaHoTro(dt); if (ly) return `động tác "${dt}" bot CHƯA HỖ TRỢ: ${ly} (xem: npm run bot -- dong-tac)`;
    const gan = DONG_TAC.filter(k => k.toLowerCase().includes(dt.toLowerCase().slice(0, 4))).slice(0, 8);
    return `không có động tác "${dt}" – id theo HT_DT của app, xem: npm run bot -- dong-tac${gan.length ? ` (gần giống: ${gan.join(', ')})` : ''}`;
  }
  if (sai && !(KIEU_SAI as any)[dt]?.[sai]) return `động tác ${dt} không có kiểu sai "${sai}" (có: ${Object.keys((KIEU_SAI as any)[dt] ?? {}).join(', ') || 'không'})`;
  return null;
}

export type Case = { tep: string; ten: string; moTa?: string; url: string; hat: number; nen?: 'chup' | 'truc-tiep' | 'phong'; buoc: (Buoc & { dong: number })[] };

export class LoiKichBan extends Error {}

export function docTep(tep: string): Case[] {
  const src = fs.readFileSync(tep, 'utf8');
  const lc = new LineCounter();
  const doc = parseDocument(src, { lineCounter: lc });
  if (doc.errors.length) throw new LoiKichBan(doc.errors.map(e => `${tep}:${e.linePos?.[0].line ?? '?'}: ${e.message}`).join('\n'));
  const dongCua = (duong: (string | number)[]) => {
    for (let i = duong.length; i >= 0; i--){
      const n = doc.getIn(duong.slice(0, i), true);
      if (isNode(n) && n.range) return lc.linePos(n.range[0]).line;
    }
    return 1;
  };
  const goc = doc.toJS();
  const ds: { du: unknown; duong: (string | number)[] }[] =
    Array.isArray(goc) ? goc.map((du, i) => ({ du, duong: [i] })) :
    goc && Array.isArray(goc.cases) ? goc.cases.map((du: unknown, i: number) => ({ du, duong: ['cases', i] })) :
    [{ du: goc, duong: [] }];
  const loi: string[] = [];
  const cases: Case[] = [];
  for (const { du, duong } of ds){
    const r = KichBan.safeParse(du);
    if (!r.success) for (const v of r.error.issues) loi.push(`${tep}:${dongCua([...duong, ...v.path])}: ${v.path.join('.') || '(case)'}: ${v.message}`);
    const buoc: Case['buoc'] = [];
    const dsBuoc: Record<string, unknown>[] = r.success ? r.data.buoc : Array.isArray((du as any)?.buoc) ? (du as any).buoc.filter((b: unknown) => b && typeof b === 'object') : [];
    dsBuoc.forEach((b, i) => {
      const dong = dongCua([...duong, 'buoc', i]);
      const lenh = (Object.keys(LENH) as TenLenh[]).filter(k => k in b);
      if (lenh.length !== 1){ loi.push(`${tep}:${dong}: bước ${i + 1}: cần đúng một lệnh trong ${Object.keys(LENH).join(' · ')} (thấy: ${Object.keys(b).join(', ')})`); return; }
      const v = LENH[lenh[0]].safeParse(b);
      if (!v.success){ for (const e of v.error.issues) loi.push(`${tep}:${dongCua([...duong, 'buoc', i, ...e.path])}: bước ${i + 1} (${lenh[0]}): ${e.path.join('.') || ''} ${e.message}`.replace(/\s+/g, ' ')); return; }
      const d: any = v.data;
      const sai = lenh[0] === 'lam' ? kiemDongTac(d.lam, d.kieu_sai)
        : lenh[0] === 'tu_dong' ? [...Object.entries<string>(d.tu_dong.sai ?? {}).map(([k, x]) => kiemDongTac(k, x)), ...Object.keys(d.tu_dong.bien_do ?? {}).map(k => kiemDongTac(k))].find(Boolean) ?? null : null;
      if (sai){ loi.push(`${tep}:${dong}: bước ${i + 1} (${lenh[0]}): ${sai}`); return; }
      buoc.push({ ...d, lenh: lenh[0], dong });
    });
    if (!r.success) continue;
    cases.push({ tep, ten: r.data.case, moTa: r.data.mo_ta, url: r.data.url, hat: r.data.hat, nen: r.data.nen, buoc });
  }
  if (loi.length) throw new LoiKichBan(loi.join('\n'));
  const trung = cases.map(c => c.ten).filter((t, i, a) => a.indexOf(t) !== i);
  if (trung.length) throw new LoiKichBan(`${tep}: tên case bị trùng: ${[...new Set(trung)].join(', ')}`);
  return cases;
}

/** tệp .yaml / .yml, hoặc thư mục (đọc mọi tệp YAML bên trong, theo thứ tự tên) */
export function docKichBan(duong: string): Case[] {
  const st = fs.statSync(duong);
  const teps = st.isDirectory() ? fs.readdirSync(duong).filter(f => /\.ya?ml$/i.test(f)).sort().map(f => path.join(duong, f)) : [duong];
  if (!teps.length) throw new LoiKichBan(`không có tệp YAML trong ${duong}`);
  const tat = teps.flatMap(docTep);
  const trung = tat.map(c => c.ten).filter((t, i, a) => a.indexOf(t) !== i);
  if (trung.length) throw new LoiKichBan(`tên case bị trùng giữa các tệp: ${[...new Set(trung)].join(', ')}`);
  return tat;
}
