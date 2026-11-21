// Máy chủ tĩnh cho bản dựng siroby-app (dist/app) – dùng khi URL app trên localhost chưa có ai phục vụ.
// Thư mục lấy theo thứ tự: --phuc-vu <thư mục> → biến môi trường SIROBY_APP_DIST → ../../products/siroby-app/dist/app (cạnh thư mục dự án).
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const KIEU: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.wasm': 'application/wasm', '.json': 'application/json', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.bin': 'application/octet-stream', '.glb': 'model/gltf-binary', '.task': 'application/octet-stream', '.ico': 'image/x-icon',
};

export function timThuMucApp(chiDinh?: string): string | null {
  const ung = [chiDinh, process.env.SIROBY_APP_DIST, path.join(os.homedir(), 'products/siroby-app/dist/app')].filter(Boolean) as string[];
  return ung.find(d => fs.existsSync(path.join(d, 'vui/index.html'))) ?? null;
}

const congMo = (host: string, cong: number) => new Promise<boolean>(r => {
  const s = net.connect({ host, port: cong }, () => { s.destroy(); r(true); });
  s.on('error', () => r(false));
  s.setTimeout(1500, () => { s.destroy(); r(false); });
});

/** Nếu URL app trên localhost chưa có máy chủ thì tự phục vụ dist/app ở đúng cổng đó. Trả về hàm tắt (hoặc null nếu không cần). */
export async function damBaoMayChuApp(url: string, chiDinh?: string): Promise<(() => void) | null> {
  const u = new URL(url);
  const cong = +u.port || 80;
  // localhost: thử cả IPv4 lẫn IPv6 (Windows / Node mới hay phân giải localhost → ::1 trước) – tránh mở máy chủ trùng cổng
  const may = ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) ? ['127.0.0.1', '::1'] : [u.hostname];
  for (const h of may) if (await congMo(h, cong)) return null;
  if (!['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)) throw new Error(`không kết nối được ${u.origin}`);
  const goc = timThuMucApp(chiDinh);
  if (!goc) throw new Error(`${u.origin} chưa chạy và không tìm thấy bản dựng siroby-app. Dựng app rồi chỉ đường dẫn bằng --phuc-vu <dist/app> hoặc biến SIROBY_APP_DIST.`);
  const sv = http.createServer((q, s) => {
    let f = path.join(goc, decodeURIComponent((q.url ?? '/').split('?')[0]));
    if (f.startsWith(goc) && fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!f.startsWith(goc) || !fs.existsSync(f)){ s.writeHead(404); s.end(); return; }
    s.writeHead(200, { 'content-type': KIEU[path.extname(f)] ?? 'application/octet-stream' });
    fs.createReadStream(f).pipe(s);
  });
  await new Promise<void>((r, loi) => { sv.once('error', loi); sv.listen(cong, '127.0.0.1', () => r()); });
  console.log(`[bot] tự phục vụ ${goc} tại http://localhost:${cong}`);
  return () => sv.close();
}
