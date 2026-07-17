import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const sourceDir = resolve(root, process.env.FRONT_ART_SOURCE_DIR || '.front-art-source');
const assetRoot = resolve(root, 'public/assets/fronts');
const variants = {
  hd: { width: 1536, height: 1024, quality: 86 },
  web: { width: 960, height: 640, quality: 82 },
  thumbnails: { width: 480, height: 320, quality: 78 }
};
const prompts = JSON.parse(await readFile(resolve(root, 'data/front-art-prompts.json'), 'utf8'));
const model = process.env.FRONT_ART_MODEL || 'gpt-image-2';

const sha256 = async (pathOrText, isFile = true) => createHash('sha256').update(isFile ? await readFile(pathOrText) : pathOrText).digest('hex');
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { encoding: options.binary ? null : 'utf8', stdio: options.binary ? ['ignore', 'pipe', 'pipe'] : 'pipe' });
  if (result.status !== 0) throw new Error(`${command} failed: ${String(result.stderr).slice(0, 1_000)}`);
  return result.stdout;
};

const files = await readdir(sourceDir);
const sourceById = new Map();
for (const file of files) {
  if (!['.webp', '.png', '.jpg', '.jpeg'].includes(extname(file).toLowerCase())) continue;
  sourceById.set(file.slice(0, -extname(file).length), resolve(sourceDir, file));
}
const missing = prompts.filter((entry) => !sourceById.has(entry.frontId)).map((entry) => entry.frontId);
if (missing.length) throw new Error(`Missing ${missing.length} front artwork sources: ${missing.join(', ')}`);

for (const directory of Object.keys(variants)) await mkdir(resolve(assetRoot, directory), { recursive: true });

const processImage = (source, output, spec) => run('ffmpeg', [
  '-hide_banner', '-loglevel', 'error', '-y', '-i', source,
  '-vf', `scale=${spec.width}:${spec.height}:force_original_aspect_ratio=increase,crop=${spec.width}:${spec.height}`,
  '-frames:v', '1', '-c:v', 'libwebp', '-quality', String(spec.quality), '-compression_level', '6',
  '-map_metadata', '-1', '-metadata', 'title=', '-metadata', 'comment=', output
]);

const averageColor = (source) => {
  const rgb = run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', source, '-vf', 'scale=1:1', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { binary: true });
  return `#${[...rgb.subarray(0, 3)].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
};

const assets = [];
for (const [index, entry] of prompts.entries()) {
  const source = sourceById.get(entry.frontId);
  const outputs = {};
  for (const [variant, spec] of Object.entries(variants)) {
    const output = resolve(assetRoot, variant, `${entry.frontId}.webp`);
    processImage(source, output, spec);
    outputs[variant] = output;
  }
  assets.push({
    frontId: entry.frontId,
    sourcePromptHash: await sha256(entry.prompt, false),
    model,
    width: variants.hd.width,
    height: variants.hd.height,
    web: `/assets/fronts/web/${entry.frontId}.webp`,
    hd: `/assets/fronts/hd/${entry.frontId}.webp`,
    thumbnail: `/assets/fronts/thumbnails/${entry.frontId}.webp`,
    hashes: {
      web: await sha256(outputs.web),
      hd: await sha256(outputs.hd),
      thumbnail: await sha256(outputs.thumbnails)
    },
    dominantColor: averageColor(outputs.web),
    focalPoint: entry.focalPoint,
    altZh: `${entry.nameZh}战线场景`
  });
  console.log(`[${index + 1}/${prompts.length}] processed ${entry.frontId}`);
}

const hidden = resolve(assetRoot, 'hidden.webp');
run('ffmpeg', [
  '-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=#111917:s=1536x1024:d=1',
  '-vf', 'noise=alls=7:allf=t+u,vignette=PI/4', '-frames:v', '1', '-c:v', 'libwebp', '-quality', '82',
  '-map_metadata', '-1', '-metadata', 'title=', '-metadata', 'comment=', hidden
]);

await writeFile(resolve(assetRoot, 'manifest.json'), `${JSON.stringify({ schemaVersion: 1, model, count: assets.length, hidden: '/assets/fronts/hidden.webp', assets }, null, 2)}\n`, 'utf8');
console.log(`Processed ${assets.length} front artwork assets with model provenance ${model}`);
