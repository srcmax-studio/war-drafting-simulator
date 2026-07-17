import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const SAMPLE_RATE = 44_100;
const root = resolve(import.meta.dirname, '..');
const sourceRoot = resolve(root, '.audio-source');
const assetRoot = resolve(root, 'public/assets/audio');
const musicRoot = resolve(assetRoot, 'music');
const sfxRoot = resolve(assetRoot, 'sfx');

const music = [
  { id: 'home-theme', duration: 44, bpm: 76, root: 50, mood: 0.56, progression: [0, 3, 4, 2], melody: [0, 4, 7, 9, 7, 4, 2, 0] },
  { id: 'lobby-theme', duration: 48, bpm: 82, root: 48, mood: 0.5, progression: [0, 2, 3, 4], melody: [0, 2, 4, 7, 4, 9, 7, 2] },
  { id: 'room-theme', duration: 36, bpm: 68, root: 53, mood: 0.42, progression: [0, 4, 2, 3], melody: [0, 7, 4, 2, 4, 7, 9, 7] },
  { id: 'battle-theme', duration: 60, bpm: 104, root: 45, mood: 0.82, progression: [0, 3, 2, 4], melody: [0, 2, 7, 4, 9, 7, 4, 2] },
  { id: 'final-turn', duration: 34, bpm: 124, root: 45, mood: 1, progression: [0, 4, 3, 4], melody: [0, 7, 9, 11, 9, 7, 4, 11] },
  { id: 'victory', duration: 8, bpm: 92, root: 50, mood: 0.9, progression: [0, 3, 4, 0], melody: [0, 4, 7, 12, 16, 12, 19, 24], stinger: true },
  { id: 'defeat', duration: 8, bpm: 66, root: 47, mood: 0.34, progression: [0, 2, 1, 0], melody: [7, 4, 2, 0, -3, 0, -5, -12], stinger: true },
  { id: 'draw-withdrawal', duration: 8, bpm: 72, root: 48, mood: 0.45, progression: [0, 3, 2, 0], melody: [0, 4, 7, 4, 2, 0, -3, 0], stinger: true }
];

const sfxIds = [
  'button', 'button-primary', 'back', 'error', 'success', 'card-hover', 'card-select', 'card-draw', 'card-deploy', 'card-reveal',
  'power-up', 'power-down', 'card-move', 'card-copy', 'card-generate', 'card-death', 'card-revive', 'card-return', 'front-lock',
  'front-reveal', 'front-effect', 'turn-start', 'countdown', 'lock-own', 'lock-opponent', 'initiative', 'banner', 'stake-up',
  'withdrawal', 'victory', 'defeat', 'draw'
];

const clamp = (value) => Math.max(-1, Math.min(1, value));
const midi = (note) => 440 * 2 ** ((note - 69) / 12);
const panGains = (pan) => [Math.cos((pan + 1) * Math.PI / 4), Math.sin((pan + 1) * Math.PI / 4)];
const random = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
};

function addTone(buffer, start, duration, frequency, amplitude, options = {}) {
  const begin = Math.max(0, Math.floor(start * SAMPLE_RATE));
  const end = Math.min(buffer.length / 2, Math.floor((start + duration) * SAMPLE_RATE));
  const attack = options.attack ?? Math.min(0.035, duration * 0.18);
  const release = options.release ?? Math.min(0.16, duration * 0.35);
  const [left, right] = panGains(options.pan ?? 0);
  const brightness = options.brightness ?? 0.32;
  for (let frame = begin; frame < end; frame += 1) {
    const t = frame / SAMPLE_RATE - start;
    const tail = duration - t;
    const envelope = Math.min(1, t / Math.max(0.001, attack), tail / Math.max(0.001, release));
    const decay = options.decay ? Math.exp(-t * options.decay) : 1;
    const phase = Math.PI * 2 * frequency * t;
    const sample = Math.sin(phase) + brightness * Math.sin(phase * 2 + 0.23) + brightness * 0.35 * Math.sin(phase * 3 + 0.71);
    const value = sample * amplitude * envelope * decay / (1 + brightness * 1.35);
    buffer[frame * 2] += value * left;
    buffer[frame * 2 + 1] += value * right;
  }
}

function addNoise(buffer, start, duration, amplitude, seed, options = {}) {
  const rand = random(seed);
  const begin = Math.max(0, Math.floor(start * SAMPLE_RATE));
  const end = Math.min(buffer.length / 2, Math.floor((start + duration) * SAMPLE_RATE));
  const [left, right] = panGains(options.pan ?? 0);
  let filtered = 0;
  for (let frame = begin; frame < end; frame += 1) {
    const t = frame / SAMPLE_RATE - start;
    const envelope = Math.sin(Math.PI * Math.min(1, t / duration)) ** (options.sharp ? 0.35 : 1.2);
    filtered += ((rand() * 2 - 1) - filtered) * (options.filter ?? 0.08);
    const value = filtered * amplitude * envelope;
    buffer[frame * 2] += value * left;
    buffer[frame * 2 + 1] += value * right;
  }
}

function addDrum(buffer, start, amplitude, seed) {
  const duration = 0.42;
  const begin = Math.max(0, Math.floor(start * SAMPLE_RATE));
  const end = Math.min(buffer.length / 2, Math.floor((start + duration) * SAMPLE_RATE));
  for (let frame = begin; frame < end; frame += 1) {
    const t = frame / SAMPLE_RATE - start;
    const frequency = 92 - 55 * Math.min(1, t / duration);
    const body = Math.sin(Math.PI * 2 * frequency * t) * Math.exp(-t * 10);
    const value = body * amplitude;
    buffer[frame * 2] += value * 0.72;
    buffer[frame * 2 + 1] += value * 0.72;
  }
  addNoise(buffer, start, 0.09, amplitude * 0.22, seed, { filter: 0.2, sharp: true });
}

function fadeEdges(buffer, seconds = 0.3) {
  const frames = buffer.length / 2;
  const fadeFrames = Math.min(frames / 2, Math.floor(seconds * SAMPLE_RATE));
  for (let frame = 0; frame < fadeFrames; frame += 1) {
    const gain = frame / Math.max(1, fadeFrames - 1);
    buffer[frame * 2] *= gain;
    buffer[frame * 2 + 1] *= gain;
    buffer[(frames - frame - 1) * 2] *= gain;
    buffer[(frames - frame - 1) * 2 + 1] *= gain;
  }
}

function normalize(buffer, peak = 0.82) {
  let maximum = 0;
  for (const value of buffer) maximum = Math.max(maximum, Math.abs(value));
  const gain = maximum > 0 ? peak / maximum : 1;
  for (let index = 0; index < buffer.length; index += 1) buffer[index] = clamp(buffer[index] * gain);
}

function renderMusic(config) {
  const buffer = new Float32Array(Math.floor(config.duration * SAMPLE_RATE) * 2);
  const beat = 60 / config.bpm;
  const bar = beat * 4;
  const scale = [0, 2, 4, 7, 9];
  const bars = Math.ceil(config.duration / bar);
  for (let index = 0; index < bars; index += 1) {
    const start = index * bar;
    const degree = config.progression[index % config.progression.length];
    const chord = [0, 4, 7].map((interval) => config.root + scale[degree % scale.length] + interval);
    for (const [noteIndex, note] of chord.entries()) {
      addTone(buffer, start, Math.min(bar * 1.08, config.duration - start), midi(note - 12), 0.052, { attack: 0.7, release: 0.8, brightness: 0.18, pan: (noteIndex - 1) * 0.34 });
    }
    if (index % 2 === 0) addNoise(buffer, start, Math.min(bar * 2, config.duration - start), 0.018, 4_811 + index, { filter: 0.012, pan: index % 4 === 0 ? -0.45 : 0.45 });
  }
  const steps = Math.floor(config.duration / (beat / 2));
  for (let step = 0; step < steps; step += 1) {
    const start = step * beat / 2;
    const melody = config.melody[step % config.melody.length];
    if (step % 2 === 0 || config.mood > 0.75) addTone(buffer, start, beat * 0.8, midi(config.root + 12 + melody), 0.078, { decay: 3.6, brightness: 0.5, pan: ((step % 6) - 2.5) / 4 });
    if (step % 4 === 0) addDrum(buffer, start, 0.09 + config.mood * 0.055, 9_101 + step);
    if (config.mood > 0.7 && step % 2 === 1) addNoise(buffer, start, 0.11, 0.025, 12_011 + step, { filter: 0.32, sharp: true, pan: step % 4 === 1 ? -0.5 : 0.5 });
  }
  if (config.stinger) {
    addTone(buffer, 0, Math.min(3.2, config.duration), midi(config.root - 12), 0.12, { attack: 0.04, release: 1.2, brightness: 0.25 });
    addTone(buffer, config.duration - 2.4, 2.2, midi(config.root + (config.id === 'victory' ? 12 : 0)), 0.11, { attack: 0.02, release: 1.4, brightness: 0.42 });
  }
  fadeEdges(buffer, config.stinger ? 0.08 : 0.5);
  normalize(buffer);
  return buffer;
}

function renderSfx(id, index) {
  const long = ['front-reveal', 'front-effect', 'turn-start', 'initiative', 'banner', 'stake-up', 'withdrawal', 'victory', 'defeat', 'draw'].includes(id);
  const duration = long ? 1.5 : ['card-draw', 'card-deploy', 'card-reveal', 'card-move', 'card-death', 'card-revive', 'card-return'].includes(id) ? 0.9 : 0.46;
  const buffer = new Float32Array(Math.floor(duration * SAMPLE_RATE) * 2);
  const base = 180 + index * 13;
  const descending = ['back', 'error', 'power-down', 'card-death', 'withdrawal', 'defeat'].includes(id);
  const ascending = ['success', 'power-up', 'card-revive', 'card-return', 'initiative', 'stake-up', 'victory'].includes(id);
  const noisy = ['card-hover', 'card-draw', 'card-deploy', 'card-move', 'front-lock', 'front-reveal', 'front-effect', 'banner', 'withdrawal'].includes(id);
  if (noisy) addNoise(buffer, 0.01, duration * 0.72, 0.19, 22_000 + index, { filter: id.includes('reveal') ? 0.035 : 0.14, sharp: id.includes('deploy') || id.includes('lock') });
  if (id.includes('deploy') || id.includes('lock') || id === 'banner') addDrum(buffer, 0.08, 0.28, 31_000 + index);
  const notes = descending ? [7, 3, 0] : ascending ? [0, 4, 9] : [0, 7, 4];
  for (const [noteIndex, offset] of notes.entries()) {
    const start = noteIndex * duration * 0.18 + 0.025;
    addTone(buffer, start, duration * 0.52, base * 2 ** (offset / 12), 0.14 - noteIndex * 0.018, { decay: 5.5, brightness: id.includes('card') ? 0.48 : 0.3, pan: (noteIndex - 1) * 0.35 });
  }
  if (id === 'countdown') addTone(buffer, 0.02, 0.25, 880, 0.2, { decay: 7, brightness: 0.2 });
  if (['victory', 'defeat', 'draw'].includes(id)) {
    const chord = id === 'victory' ? [0, 4, 7, 12] : id === 'defeat' ? [0, 3, 6, -5] : [0, 5, 7, 2];
    chord.forEach((offset, chordIndex) => addTone(buffer, 0.14 + chordIndex * 0.08, 1.1, midi(55 + offset), 0.11, { attack: 0.02, release: 0.65, brightness: 0.42, pan: (chordIndex - 1.5) / 3 }));
  }
  fadeEdges(buffer, 0.012);
  normalize(buffer, 0.88);
  return buffer;
}

function wavBytes(samples) {
  const dataLength = samples.length * 2;
  const output = Buffer.alloc(44 + dataLength);
  output.write('RIFF', 0);
  output.writeUInt32LE(36 + dataLength, 4);
  output.write('WAVEfmt ', 8);
  output.writeUInt32LE(16, 16);
  output.writeUInt16LE(1, 20);
  output.writeUInt16LE(2, 22);
  output.writeUInt32LE(SAMPLE_RATE, 24);
  output.writeUInt32LE(SAMPLE_RATE * 4, 28);
  output.writeUInt16LE(4, 32);
  output.writeUInt16LE(16, 34);
  output.write('data', 36);
  output.writeUInt32LE(dataLength, 40);
  for (let index = 0; index < samples.length; index += 1) output.writeInt16LE(Math.round(clamp(samples[index]) * 32_767), 44 + index * 2);
  return output;
}

const run = (command, args) => {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${command} failed: ${String(result.stderr).slice(0, 1_000)}`);
};
const digest = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');
const encode = (source, destination, kind) => {
  const common = ['-hide_banner', '-loglevel', 'error', '-y', '-i', source, '-af', kind === 'music' ? 'loudnorm=I=-19:TP=-1.5:LRA=10' : 'loudnorm=I=-17:TP=-1:LRA=7', '-ar', String(SAMPLE_RATE), '-ac', '2', '-map_metadata', '-1'];
  if (destination.endsWith('.mp3')) run('ffmpeg', [...common, '-c:a', 'libmp3lame', '-b:a', kind === 'music' ? '128k' : '96k', destination]);
  else run('ffmpeg', [...common, '-c:a', 'libvorbis', '-q:a', kind === 'music' ? '4' : '3', destination]);
};

await Promise.all([sourceRoot, musicRoot, sfxRoot].map((directory) => mkdir(directory, { recursive: true })));
const manifest = { schemaVersion: 1, sampleRate: SAMPLE_RATE, music: [], sfx: [] };

for (const [index, config] of music.entries()) {
  const wav = resolve(sourceRoot, `${config.id}.wav`);
  await writeFile(wav, wavBytes(renderMusic(config)));
  const mp3 = resolve(musicRoot, `${config.id}.mp3`);
  const ogg = resolve(musicRoot, `${config.id}.ogg`);
  encode(wav, mp3, 'music');
  encode(wav, ogg, 'music');
  manifest.music.push({ id: config.id, duration: config.duration, mp3: `/assets/audio/music/${config.id}.mp3`, ogg: `/assets/audio/music/${config.id}.ogg`, hashes: { mp3: await digest(mp3), ogg: await digest(ogg) } });
  console.log(`[music ${index + 1}/${music.length}] ${config.id}`);
}

for (const [index, id] of sfxIds.entries()) {
  const wav = resolve(sourceRoot, `${id}.wav`);
  const samples = renderSfx(id, index);
  await writeFile(wav, wavBytes(samples));
  const mp3 = resolve(sfxRoot, `${id}.mp3`);
  const ogg = resolve(sfxRoot, `${id}.ogg`);
  encode(wav, mp3, 'sfx');
  encode(wav, ogg, 'sfx');
  manifest.sfx.push({ id, duration: samples.length / 2 / SAMPLE_RATE, mp3: `/assets/audio/sfx/${id}.mp3`, ogg: `/assets/audio/sfx/${id}.ogg`, hashes: { mp3: await digest(mp3), ogg: await digest(ogg) } });
  console.log(`[sfx ${index + 1}/${sfxIds.length}] ${id}`);
}

await writeFile(resolve(assetRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Processed ${manifest.music.length} music tracks and ${manifest.sfx.length} sound effects`);
