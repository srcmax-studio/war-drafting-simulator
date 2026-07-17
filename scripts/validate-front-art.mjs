import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const assetRoot = resolve(root, 'public/assets/fronts');
const manifest = JSON.parse(await readFile(resolve(assetRoot, 'manifest.json'), 'utf8'));
const prompts = JSON.parse(await readFile(resolve(root, 'data/front-art-prompts.json'), 'utf8'));
const expected = {
  hd: { width: 1536, height: 1024, maximum: 1_600_000 },
  web: { width: 960, height: 640, maximum: 550_000 },
  thumbnail: { width: 480, height: 320, maximum: 180_000 }
};
const failures = [];
const ids = new Set();
const contentHashes = new Set();

const probe = (path) => {
  const result = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,width,height', '-of', 'json', path], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(String(result.stderr));
  return JSON.parse(result.stdout).streams?.[0];
};
const digest = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');
const localPath = (publicPath) => resolve(root, 'public', publicPath.replace(/^\//, ''));

if (prompts.length !== 72) failures.push(`Expected 72 prompts, received ${prompts.length}`);
if (manifest.count !== 72 || manifest.assets?.length !== 72) failures.push(`Expected 72 manifest assets, received ${manifest.assets?.length ?? 0}`);

for (const entry of manifest.assets ?? []) {
  if (ids.has(entry.frontId)) failures.push(`Duplicate frontId: ${entry.frontId}`);
  ids.add(entry.frontId);
  const prompt = prompts.find((candidate) => candidate.frontId === entry.frontId);
  if (!prompt) failures.push(`Manifest front is not enabled: ${entry.frontId}`);
  else {
    const promptHash = createHash('sha256').update(prompt.prompt).digest('hex');
    if (promptHash !== entry.sourcePromptHash) failures.push(`Prompt hash mismatch: ${entry.frontId}`);
    if (!entry.altZh || !entry.focalPoint || entry.focalPoint.x < 0 || entry.focalPoint.x > 1 || entry.focalPoint.y < 0 || entry.focalPoint.y > 1) failures.push(`Invalid accessibility metadata: ${entry.frontId}`);
  }
  for (const [variant, spec] of Object.entries(expected)) {
    try {
      const path = localPath(entry[variant]);
      const info = probe(path);
      const size = (await stat(path)).size;
      const hash = await digest(path);
      if (info.codec_name !== 'webp' || info.width !== spec.width || info.height !== spec.height) failures.push(`Invalid ${variant} encoding or dimensions: ${entry.frontId}`);
      if (size > spec.maximum) failures.push(`${variant} exceeds ${spec.maximum} bytes: ${entry.frontId} (${size})`);
      if (entry.hashes?.[variant] !== hash) failures.push(`${variant} hash mismatch: ${entry.frontId}`);
      if (variant === 'web') {
        if (contentHashes.has(hash)) failures.push(`Duplicate web artwork content: ${entry.frontId}`);
        contentHashes.add(hash);
      }
    } catch (error) {
      failures.push(`Missing or unreadable ${variant} artwork for ${entry.frontId}: ${error.message}`);
    }
  }
}

for (const prompt of prompts) if (!ids.has(prompt.frontId)) failures.push(`Missing manifest entry: ${prompt.frontId}`);
try {
  const hidden = localPath(manifest.hidden);
  const info = probe(hidden);
  if (info.codec_name !== 'webp' || info.width !== 1536 || info.height !== 1024) failures.push('Hidden artwork must be a 1536x1024 WebP');
  if ((await stat(hidden)).size > 550_000) failures.push('Hidden artwork exceeds 550000 bytes');
} catch (error) {
  failures.push(`Missing or unreadable hidden artwork: ${error.message}`);
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}
console.log(`Validated ${manifest.assets.length} unique front artwork sets and one hidden-state asset`);
