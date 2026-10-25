import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

// Map of root file names to their canonical subfolder locations
const fileMap = {
  // src/components
  'BarangayMap.tsx': 'src/components/BarangayMap.tsx',
  'Header.tsx': 'src/components/Header.tsx',
  'HouseholdView.tsx': 'src/components/HouseholdView.tsx',
  'KagawadDashboard.tsx': 'src/components/KagawadDashboard.tsx',
  'RaspberryPiCenter.tsx': 'src/components/RaspberryPiCenter.tsx',
  'ResolutionLogs.tsx': 'src/components/ResolutionLogs.tsx',
  'SourceCodeCenter.tsx': 'src/components/SourceCodeCenter.tsx',
  'TelegramCenter.tsx': 'src/components/TelegramCenter.tsx',
  'LiveCameraModal.tsx': 'src/components/LiveCameraModal.tsx',
  'StreetView360.tsx': 'src/components/StreetView360.tsx',
  'ThreeDIcons.tsx': 'src/components/ThreeDIcons.tsx',

  // src/context
  'LanguageContext.tsx': 'src/context/LanguageContext.tsx',
  'LocationContext.tsx': 'src/context/LocationContext.tsx',

  // src/utils
  'audioAlarm.ts': 'src/utils/audioAlarm.ts',
  'translations.ts': 'src/utils/translations.ts',
  'imageCompressor.ts': 'src/utils/imageCompressor.ts',
  'jurisdiction.ts': 'src/utils/jurisdiction.ts',

  // src
  'App.tsx': 'src/App.tsx',
  'main.tsx': 'src/main.tsx',
  'index.css': 'src/index.css',
  'types.ts': 'src/types.ts',

  // public
  'icon.svg': 'public/icon.svg',
  'manifest.json': 'public/manifest.json',
  'sw.js': 'public/sw.js',

  // bin
  'nmp': 'bin/nmp',
  'nmp.js': 'bin/nmp.js',

  // data
  'pulse_reports.json': 'data/pulse_reports.json',

  // raspberry-pi-server
  'server.py': 'raspberry-pi-server/server.py',
  'setup_autostart.sh': 'raspberry-pi-server/setup_autostart.sh',

  // dotfiles without dots
  'env.example': '.env.example',
  'npmrc': '.npmrc',
};

// Check if any destination is missing but exists in root (e.g. flattened repo clone)
for (const [srcName, destRel] of Object.entries(fileMap)) {
  const destPath = path.join(root, destRel);
  const srcPath = path.join(root, srcName);

  if (!fs.existsSync(destPath) && fs.existsSync(srcPath)) {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    try {
      fs.copyFileSync(srcPath, destPath);
      console.log(`[P.U.L.S.E. Structure] Restored ${srcName} -> ${destRel}`);
    } catch (e) {
      console.warn(`[P.U.L.S.E. Structure] Could not copy ${srcName}:`, e);
    }
  }
}

// Ensure bin/nmp exists and node_modules/.bin/nmp is executable
try {
  const binDir = path.join(root, 'node_modules', '.bin');
  fs.mkdirSync(binDir, { recursive: true });
  const nmpCandidates = [
    path.join(root, 'bin', 'nmp'),
    path.join(root, 'nmp'),
  ];
  for (const nmpSrc of nmpCandidates) {
    if (fs.existsSync(nmpSrc)) {
      const dest = path.join(binDir, 'nmp');
      fs.copyFileSync(nmpSrc, dest);
      try {
        fs.chmodSync(dest, 0o755);
      } catch {}
      break;
    }
  }
} catch {
  // non-fatal
}
