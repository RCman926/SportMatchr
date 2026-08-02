/**
 * Prepare Expo web dist for Cloudflare Pages.
 * Wrangler skips paths matching root .gitignore (any folder named node_modules),
 * so Expo asset paths under assets/node_modules never upload. Browsers then get
 * index.html for .ttf requests and throw OTS / Failed to decode downloaded font.
 */
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const fromDir = path.join(dist, 'assets', 'node_modules');
const toDir = path.join(dist, 'assets', 'bundled');

function copyRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

if (!fs.existsSync(fromDir)) {
  console.log('No assets/node_modules — nothing to flatten');
  process.exit(0);
}

if (fs.existsSync(toDir)) fs.rmSync(toDir, { recursive: true, force: true });
copyRecursive(fromDir, toDir);
fs.rmSync(fromDir, { recursive: true, force: true });

const jsDir = path.join(dist, '_expo', 'static', 'js', 'web');
for (const file of fs.readdirSync(jsDir).filter((f) => f.endsWith('.js'))) {
  const p = path.join(jsDir, file);
  const before = fs.readFileSync(p, 'utf8');
  const after = before
    .replaceAll('assets/node_modules/@expo-google-fonts', 'assets/bundled/expo-google-fonts')
    .replaceAll('assets/node_modules/expo-router', 'assets/bundled/expo-router')
    .replaceAll('assets/node_modules/', 'assets/bundled/');
  // Also rename @expo-google-fonts folder on disk
  fs.writeFileSync(p, after);
  console.log('Patched', file);
}

const scoped = path.join(toDir, '@expo-google-fonts');
const unscoped = path.join(toDir, 'expo-google-fonts');
if (fs.existsSync(scoped)) {
  if (fs.existsSync(unscoped)) fs.rmSync(unscoped, { recursive: true, force: true });
  fs.renameSync(scoped, unscoped);
  console.log('Renamed @expo-google-fonts → expo-google-fonts');
}

// SPA fallback only for extension-less routes (don't swallow .ttf/.js/.png)
fs.writeFileSync(
  path.join(dist, '_redirects'),
  [
    '# Serve real files first; SPA fallback for client routes only',
    '/assets/*  /assets/:splat  200',
    '/_expo/*   /_expo/:splat   200',
    '/favicon.ico  /favicon.ico  200',
    '/*    /index.html   200',
    '',
  ].join('\n')
);

// Prevent Pages ignore rules from dropping anything in this upload root
fs.writeFileSync(path.join(dist, '.assetsignore'), '!\n');

console.log('dist ready for Cloudflare Pages');
