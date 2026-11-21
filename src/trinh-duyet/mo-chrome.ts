// Mở Chrome thật (Playwright), phục vụ tệp bot dưới /__bot/* CÙNG origin với app, gắn init script thay camera + mắt.
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { damBaoMayChuApp } from './may-chu-app.js';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const KIEU: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.tflite': 'application/octet-stream', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.hdr': 'application/octet-stream',
};
// /__bot/<tiền tố>/... → thư mục trên đĩa
const BAN_DO: Record<string, string> = {
  'san-khau': path.join(GOC, 'src/san-khau'),
  'dong-tac': path.join(GOC, 'src/dong-tac'),
  'three': path.join(GOC, 'node_modules/three'),
  'assets': path.join(GOC, 'assets'),
  'mediapipe': path.join(GOC, 'node_modules/@mediapipe/tasks-vision'),
};

export type TuyChonMo = {
  url: string;                 // trang app
  nv?: string;                 // be-trai-11 (mặc định) | tam/Soldier | tam/Michelle
  nen?: 'chup' | 'truc-tiep' | 'phong';
  dem?: number;                // giây đếm ngược trước khi chụp nền
  hat?: number;                // hạt ngẫu nhiên của chuyển động
  quayVideo?: string;          // thư mục lưu video tab app
  coVideo?: { width: number; height: number };   // cỡ video bằng chứng (mặc định 1024×560 – đọc rõ chữ, nhẹ hơn ~½ so với 1408×770)
  hien?: boolean;
  phucVu?: string;             // thư mục dist/app để tự phục vụ khi URL localhost chưa chạy
};
export type PhienBot = { browser: Browser; ctx: BrowserContext; sanKhau: Page; app: Page; dong(): Promise<void> };

export type TuyChonSanKhau = { nv?: string; nen?: string; dem?: number; hauKy?: boolean; hat?: number; cuoi?: number };

export async function moSanKhau(page: Page, goc: string, o: TuyChonSanKhau){
  const ts = new URLSearchParams({ nv: o.nv ?? 'be-trai-11', nen: o.nen ?? 'chup', dem: String(o.dem ?? 5), hauky: o.hauKy === false ? '0' : '1', hat: String(o.hat ?? 7), cuoi: String(o.cuoi ?? 1) });
  page.on('pageerror', e => console.error('[sân khấu] ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('[sân khấu] ' + m.text()); });
  await page.goto(`${goc}/__bot/san-khau/index.html?${ts}`);
  // in lời nhắc đếm ngược chụp nền ra terminal
  let cuoi = '';
  const theo = setInterval(async () => { const s = await page.textContent('#tt').catch(() => ''); if (s && s !== cuoi && /Rời khỏi|chụp nền|Còn người/.test(s)) console.log('[sân khấu] ' + (cuoi = s)); }, 300);
  try {
    await page.waitForFunction(() => (window as any).__botSanKhau?.san === true, null, { timeout: 90_000 });
  } catch {
    throw new Error('sân khấu không sẵn sàng: ' + (await page.textContent('#tt').catch(() => '?')));
  } finally { clearInterval(theo); }
}

/** Chrome thật + context: phục vụ /__bot/* cùng origin `goc`, gắn init script thay camera + mắt */
export async function moTrinhDuyet(goc: string, o: { quayVideo?: string; hien?: boolean; coVideo?: { width: number; height: number } } = {}){
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
    ...(o.quayVideo ? { recordVideo: { dir: o.quayVideo, size: o.coVideo ?? { width: 1024, height: 560 } } } : {}),
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
  return { browser, ctx };
}

export async function moPhien(o: TuyChonMo): Promise<PhienBot> {
  const goc = new URL(o.url).origin;
  const tatMayChu = await damBaoMayChuApp(o.url, o.phucVu);
  const { browser, ctx } = await moTrinhDuyet(goc, o);
  // sân khấu mở trước, sẵn sàng trả lời offer
  const sanKhau = await ctx.newPage();
  await moSanKhau(sanKhau, goc, o);
  const app = await ctx.newPage();
  await app.goto(o.url, { timeout: 90_000 });
  return { browser, ctx, sanKhau, app, async dong(){ await ctx.close(); await browser.close(); tatMayChu?.(); } };
}

export type ChuThay = { canvas: string[]; dom: string[] };
export const docChu = (app: Page): Promise<ChuThay> =>
  app.evaluate(() => (window as any).__botMat?.thay() ?? { canvas: [], dom: [] });
