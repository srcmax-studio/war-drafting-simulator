import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(resolve(root, 'public/assets/audio/manifest.json'), 'utf8'));
const failures = [];
const hashes = new Set();
let totalBytes = 0;

const pathFor = (publicPath) => resolve(root, 'public', publicPath.replace(/^\//, ''));
const digest = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');
const probe = (path) => {
  const result = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_name,sample_rate,channels', '-of', 'json', path], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(String(result.stderr));
  return JSON.parse(result.stdout);
};

if (manifest.music?.length !== 8) failures.push(`Expected 8 music tracks, received ${manifest.music?.length ?? 0}`);
if (manifest.sfx?.length !== 32) failures.push(`Expected 32 sound effects, received ${manifest.sfx?.length ?? 0}`);

for (const [kind, entries] of [['music', manifest.music ?? []], ['sfx', manifest.sfx ?? []]]) {
  const ids = new Set();
  for (const entry of entries) {
    if (ids.has(entry.id)) failures.push(`Duplicate ${kind} id: ${entry.id}`);
    ids.add(entry.id);
    for (const format of ['mp3', 'ogg']) {
      try {
        const path = pathFor(entry[format]);
        const fileStat = await stat(path);
        const info = probe(path);
        const stream = info.streams?.[0];
        const duration = Number(info.format?.duration);
        const hash = await digest(path);
        totalBytes += fileStat.size;
        if (stream?.sample_rate !== '44100' || stream?.channels !== 2) failures.push(`Invalid sample format: ${entry.id}.${format}`);
        if (format === 'mp3' && stream?.codec_name !== 'mp3') failures.push(`Invalid MP3 codec: ${entry.id}`);
        if (format === 'ogg' && stream?.codec_name !== 'vorbis') failures.push(`Invalid Ogg codec: ${entry.id}`);
        if (!Number.isFinite(duration) || duration <= 0 || (kind === 'music' ? duration > 65 : duration > 2.1)) failures.push(`Invalid duration: ${entry.id}.${format} (${duration})`);
        if (fileStat.size > (kind === 'music' ? 1_200_000 : 180_000)) failures.push(`Audio file exceeds budget: ${entry.id}.${format} (${fileStat.size})`);
        if (entry.hashes?.[format] !== hash) failures.push(`Hash mismatch: ${entry.id}.${format}`);
        if (hashes.has(hash)) failures.push(`Duplicate audio content: ${entry.id}.${format}`);
        hashes.add(hash);
      } catch (error) {
        failures.push(`Missing or unreadable audio: ${entry.id}.${format}: ${error.message}`);
      }
    }
  }
}

if (totalBytes > 12_000_000) failures.push(`Total audio exceeds 12000000 bytes (${totalBytes})`);
if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}
console.log(`Validated 8 music tracks and 32 sound effects in MP3 and Ogg (${totalBytes} bytes total)`);
