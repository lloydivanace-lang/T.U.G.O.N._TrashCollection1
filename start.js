import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawn } from 'node:child_process';

const root = process.cwd();

// 1. Ensure folder structure if cloned from a flattened repository
try {
  await import('./ensure-structure.js');
} catch (e) {
  console.warn('[P.U.L.S.E.] Structure check note:', e);
}

// 2. Ensure dependencies are installed if missing
const tsxBin = path.join(root, 'node_modules', '.bin', 'tsx');
if (!fs.existsSync(tsxBin)) {
  console.log('[P.U.L.S.E.] Dependencies not found. Installing with npm install --legacy-peer-deps...');
  execSync('npm install --legacy-peer-deps', { stdio: 'inherit' });
}

// 3. Ensure frontend dist exists (auto-build if needed)
const distIndex = path.join(root, 'dist', 'index.html');
if (!fs.existsSync(distIndex)) {
  console.log('[P.U.L.S.E.] dist/index.html not found. Building frontend assets...');
  execSync('npm run build', { stdio: 'inherit' });
}

// 4. Start the Express server via tsx
console.log('[P.U.L.S.E.] Launching P.U.L.S.E. server.ts...');
const child = spawn('npx', ['tsx', 'server.ts'], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
