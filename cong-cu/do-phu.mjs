// Độ phủ bot theo NHÓM (đứng · ngồi ghế · sàn / camera nghiêng) trên đúng tập động tác kiem-bang.mjs của siroby-app đếm
// (động tác có trong thẻ bài vui/htNNN-*.js). Chỉ đọc siroby-app.
//   node cong-cu/do-phu.mjs <thư mục siroby-app>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const REPO = path.resolve(process.argv[2] || path.join(process.env.HOME, 'products/siroby-app-test-only'));
const { docTheHT, docDongTac } = await import(pathToFileURL(path.join(REPO, 'cong-cu/hieu-chuan-bot/dong-tac-app.mjs')).href);
const MAU = path.resolve('src/dong-tac/mau');
const bot = {}; for (const f of fs.readdirSync(MAU).filter(f => f.endsWith('.json'))) Object.assign(bot, JSON.parse(fs.readFileSync(path.join(MAU, f), 'utf8')).dongTac || {});
const chua = JSON.parse(fs.readFileSync('src/dong-tac/chua-ho-tro.json', 'utf8')).lyDo, lyDo = {};
for (const [k, l] of Object.entries(chua)) for (const x of l.ds) lyDo[x.id] = k;
const TEN = docDongTac(), tat = new Set(); for (const t of docTheHT(REPO)) for (const k of t.dongTac) if (TEN[k]) tat.add(k);
const nhom = k => bot[k] ? (bot[k].san ? 'san' : bot[k].ngoi ? 'ngoi' : 'dung') : 'chua:' + (lyDo[k] || '?');
const dem = {}; for (const k of tat) dem[nhom(k)] = (dem[nhom(k)] || 0) + 1;
const co = ['dung', 'ngoi', 'san'].reduce((s, k) => s + (dem[k] || 0), 0);
console.log(`bot làm được ${co}/${tat.size} (${Math.round(100 * co / tat.size)} %): đứng ${dem.dung || 0} · ngồi ghế ${dem.ngoi || 0} · sàn / camera nghiêng ${dem.san || 0}`);
console.log('chưa:', Object.entries(dem).filter(([k]) => k.startsWith('chua')).map(([k, v]) => `${k.slice(5)} ${v}`).join(' · ') || 'không');
