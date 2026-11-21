#!/usr/bin/env node
// Chạy CLI TypeScript qua tsx – `npx bot ...`
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const goc = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const r = spawnSync(process.execPath, ['--import', 'tsx', path.join(goc, 'src/cli.ts'), ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(r.status ?? 1);
