// NÉN VIDEO BẰNG CHỨNG – video Playwright ~9 MB / phút; nén lại VP8 15 khung/giây ~350 kbps (~⅓ dung lượng, chữ trên màn vẫn đọc rõ).
// Dùng ffmpeg đi kèm Playwright (ms-playwright/ffmpeg-*/…) hoặc ffmpeg trong PATH. Không có thì giữ nguyên video gốc.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function thuMucPlaywright(): string {
  if (process.env.PLAYWRIGHT_BROWSERS_PATH) return process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library/Caches/ms-playwright');
  if (process.platform === 'win32') return path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData/Local'), 'ms-playwright');
  return path.join(os.homedir(), '.cache/ms-playwright');
}

let daTim: string | null | undefined;
export function timFfmpeg(): string | null {
  if (daTim !== undefined) return daTim;
  const goc = thuMucPlaywright();
  const ten = process.platform === 'win32' ? ['ffmpeg-win64.exe', 'ffmpeg-win32.exe'] : process.platform === 'darwin' ? ['ffmpeg-mac'] : ['ffmpeg-linux'];
  const ung = fs.existsSync(goc) ? fs.readdirSync(goc).filter(d => d.startsWith('ffmpeg')).sort().reverse().flatMap(d => ten.map(t => path.join(goc, d, t))) : [];
  daTim = ung.find(f => fs.existsSync(f)) ?? (spawnSync('ffmpeg', ['-version']).status === 0 ? 'ffmpeg' : null);
  return daTim;
}

/** nén `vao` → `ra`. Trả về true nếu đã nén; false nếu không có ffmpeg / lỗi (khi đó chép nguyên bản) */
export function nenVideo(vao: string, ra: string): boolean {
  const ff = timFfmpeg();
  if (ff){
    const r = spawnSync(ff, ['-hide_banner', '-loglevel', 'error', '-y', '-i', vao, '-r', '15', '-c:v', 'libvpx', '-b:v', '350k', '-crf', '30',
      '-deadline', 'realtime', '-cpu-used', '8', ra], { stdio: 'pipe' });
    if (r.status === 0 && fs.existsSync(ra) && fs.statSync(ra).size > 0) return true;
  }
  fs.copyFileSync(vao, ra);
  return false;
}
