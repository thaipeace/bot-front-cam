// MẮT (phía Node) – đọc chữ đang thấy trên tab app 10 lần / giây (src/mat/mat.init.js), lọc nhiễu, chờ chữ.
//  - bỏ chữ không phải hướng dẫn: số góc khớp app vẽ lên khung xương ("165°"), số điểm / đếm ngược thuần số ("1.240", "3")
//  - so khớp: chứa chuỗi, không phân biệt hoa thường, gộp khoảng trắng; tuỳ chọn bỏ dấu tiếng Việt (khong_dau)
import type { Page } from 'playwright';
import type { ChoChu } from './schema.js';

const NHIEU = /^[+\-]?\d[\d.,]*°?$/;
export const chuanHoa = (s: string, khongDau = false) => {
  let r = s.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
  if (khongDau) r = r.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd');
  return r;
};

export class HetGio extends Error {}

export class Mat {
  hien: string[] = [];                         // chữ đang thấy (đã lọc), DOM + canvas
  lichSu: { t: number; s: string }[] = [];     // mỗi lần một chữ MỚI xuất hiện (giây theo đồng hồ máy)
  private dung = false;
  private nghe = new Set<() => void>();
  constructor(private app: Page, private moi?: (chu: string[]) => void){}

  batDau(){
    (async () => {
      let truoc = new Set<string>();
      while (!this.dung){
        try {
          const c = await this.app.evaluate(() => (window as any).__botMat?.thay() ?? { canvas: [], dom: [] }) as { canvas: string[]; dom: string[] };
          this.hien = [...new Set([...c.canvas, ...c.dom])].filter(s => !NHIEU.test(s));
          const moi = this.hien.filter(s => !truoc.has(s));
          if (moi.length){ const t = Date.now() / 1000; for (const s of moi) this.lichSu.push({ t, s }); if (this.moi) this.moi(moi); }
          truoc = new Set(this.hien);
          for (const f of this.nghe) f();
        } catch { /* trang đang chuyển – đọc lại vòng sau */ }
        await new Promise(r => setTimeout(r, 100));
      }
    })();
    return this;
  }
  tat(){ this.dung = true; }

  /** chữ (đã lọc) đang thấy khớp `chu` – trả về chuỗi gốc khớp, hoặc null */
  thay(c: ChoChu): string | null {
    const can = chuanHoa(c.chu, c.khong_dau);
    return this.hien.find(s => chuanHoa(s, c.khong_dau).includes(can)) ?? null;
  }

  /** chữ khớp đã xuất hiện trong `giay` giây vừa qua (kể cả đang hiện) */
  daThay(c: ChoChu, giay: number): { s: string; t: number } | null {
    const can = chuanHoa(c.chu, c.khong_dau), tu = Date.now() / 1000 - giay;
    return this.lichSu.find(x => x.t >= tu && chuanHoa(x.s, c.khong_dau).includes(can)) ?? null;   // lần XUẤT HIỆN đầu tiên trong khoảng
  }

  /** chờ tới khi thấy chữ (tối đa c.toi_da giây) */
  cho(c: ChoChu, toiDa = c.toi_da): Promise<string> {
    const co = this.thay(c); if (co) return Promise.resolve(co);
    return new Promise((ok, loi) => {
      const xong = () => { const s = this.thay(c); if (s){ clearTimeout(h); this.nghe.delete(xong); ok(s); } };
      const h = setTimeout(() => { this.nghe.delete(xong); loi(new HetGio(`không thấy "${c.chu}" sau ${toiDa} giây`)); }, toiDa * 1000);
      this.nghe.add(xong);
    });
  }
}
