import { build } from 'esbuild';
import { mkdir, readFile, writeFile, copyFile, readdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { publicConfig } from './public-config.mjs';
const assets = ['index.html', 'app.js', 'backup.js', 'advanced.js', 'content.js', 'curriculum.js', 'situations.js', 'video.js', 'advanced.css', 'curriculum.css', 'video.css', 'cloud.css', 'brand.css', 'fonts.css', 'theme.css', 'BRAND_PREVIEW.html', 'sw.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'words.json', 'grammar.json', 'dialogues.json', 'passages.json', 'reorders.json', 'samples.original.json', 'content.multi-level.seed.json'];
for(const file of await readdir('assets',{recursive:true})) {
  const path='assets/'+file.replace(/\\/g,'/');
  // The mascot pack is design source (19 MB of boards and PNGs); pages use the copies in assets/mascot, icons and brand.
  if(/\.(svg|png|webp|jpe?g|avif|woff2)$/i.test(path)&&!path.startsWith('assets/Hanzi_Studio_MayLong_Mascots_Asset/'))assets.push(path);
}
assets.push('assets/fonts/OFL.txt');
await mkdir('dist', { recursive: true });
for (const name of assets) {await mkdir(dirname(`dist/${name}`),{recursive:true});await copyFile(name, `dist/${name}`);}
await mkdir('dist/data',{recursive:true});
const dataAssets=['hsk2-reference.json','hsk2-provenance.json','CC-BY-SA-4.0.txt'];
for(const name of dataAssets)await copyFile(`data/${name}`,`dist/data/${name}`);
const {url,key}=publicConfig();
if(process.env.VERCEL_ENV==='production'&&!url)throw Error('Production requires the public Supabase URL and publishable key. Check the Marketplace integration environment variables.');
await writeFile('dist/cloud-config.js', `window.HANZI_CLOUD_CONFIG=${JSON.stringify({ url, key }).replace(/</g, '\\u003c')};\n`);
await build({ entryPoints: ['src/cloud.js'], outfile: 'dist/cloud.bundle.js', bundle: true, minify: true, format: 'iife', target: 'es2022' });
// The shell cache name follows the actual asset content, including public config.
const { createHash } = await import('node:crypto');
const hash = createHash('sha256');
for (const name of [...assets.filter(x => x !== 'sw.js'), 'cloud.bundle.js', 'cloud-config.js']) hash.update(await readFile(`dist/${name}`));
const sw = await readFile('dist/sw.js', 'utf8');
await writeFile('dist/sw.js', sw.replace('__BUILD__', hash.digest('hex').slice(0, 12)));
console.log('Built static site into dist/ (cloud ' + (url ? 'configured' : 'disabled') + ').');
