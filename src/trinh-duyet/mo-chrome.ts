// Mở Chrome thật (Playwright), phục vụ tệp bot dưới /__bot/* CÙNG origin với app, gắn init script thay camera + mắt.
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { damBaoMayChuApp } from './may-chu-app.js';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const KIEU: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.hdr': 'application/octet-stream',
};
// /__bot/<tiền tố>/... → thư mục trên đĩa
const BAN_DO: Record<string, string> = {
  'san-khau': path.join(GOC, 'src/san-khau'),
  'three': path.join(GOC, 'node_modules/three'),
  'assets': path.join(GOC, 'assets'),
};

export type TuyChonMo = {
  url: string;                 // trang app
  nv?: string;                 // nhân vật (GĐ 0: Soldier | Michelle)
  nen?: 'phong' | 'webcam';
  quayVideo?: string;          // thư mục lưu video tab app
  hien?: boolean;
  phucVu?: string;             // thư mục dist/app để tự phục vụ khi URL localhost chưa chạy
};
export type PhienBot = { browser: Browser; ctx: BrowserContext; sanKhau: Page; app: Page; dong(): Promise<void> };

export async function moSanKhau(page: Page, goc: string, o: { nv?: string; nen?: string; hanh?: string }){
  const ts = new URLSearchParams({ nv: o.nv ?? 'Soldier', nen: o.nen ?? 'phong' });
  await page.goto(`${goc}/__bot/san-khau/index.html?${ts}`);
  try {
    await page.waitForFunction(() => (window as any).__botSanKhau?.san === true, null, { timeout: 60_000 });
  } catch {
    throw new Error('sân khấu không sẵn sàng: ' + (await page.textContent('#tt').catch(() => '?')));
  }
}

export async function moPhien(o: TuyChonMo): Promise<PhienBot> {
  const goc = new URL(o.url).origin;
  const tatMayChu = await damBaoMayChuApp(o.url, o.phucVu);
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: o.hien === false,
    args: [
      '--use-fake-ui-for-media-stream',            // tự đồng ý quyền camera (chỉ sân khấu dùng webcam thật)
      '--autoplay-policy=no-user-gesture-required',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
    ],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1408, height: 770 },        // màn chính của anh Hoàng (luật H8)
    permissions: ['camera', 'microphone'],
    serviceWorkers: 'block',                        // để route /__bot/* không bị service worker của app nuốt
    ...(o.quayVideo ? { recordVideo: { dir: o.quayVideo, size: { width: 1408, height: 770 } } } : {}),
  });
  await ctx.route(`${goc}/__bot/**`, async r => {
    const p = decodeURIComponent(new URL(r.request().url()).pathname).replace(/^\/__bot\//, '');
    const [dau, ...con] = p.split('/');
    const thuMuc = BAN_DO[dau];
    const tep = thuMuc ? path.join(thuMuc, ...con) : '';
    if (!thuMuc || !tep.startsWith(thuMuc) || !fs.existsSync(tep) || fs.statSync(tep).isDirectory()) { console.error('[bot] 404 ' + p); return r.fulfill({ status: 404, body: 'không có' }); }
    return r.fulfill({ status: 200, contentType: KIEU[path.extname(tep)] ?? 'application/octet-stream', body: fs.readFileSync(tep) });
  });
  await ctx.addInitScript({ path: path.join(GOC, 'src/trinh-duyet/thay-camera.init.js') });
  await ctx.addInitScript({ path: path.join(GOC, 'src/mat/mat.init.js') });

  // sân khấu mở trước, sẵn sàng trả lời offer
  const sanKhau = await ctx.newPage();
  sanKhau.on('pageerror', e => console.error('[sân khấu] ' + e.message));
  sanKhau.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('[sân khấu] ' + m.text()); });
  await moSanKhau(sanKhau, goc, o);

  const app = await ctx.newPage();
  await app.goto(o.url, { timeout: 90_000 });
  return { browser, ctx, sanKhau, app, async dong(){ await ctx.close(); await browser.close(); tatMayChu?.(); } };
}

export type ChuThay = { canvas: string[]; dom: string[] };
export const docChu = (app: Page): Promise<ChuThay> =>
  app.evaluate(() => (window as any).__botMat?.thay() ?? { canvas: [], dom: [] });
