import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const MODEL = 'gpt-image-2';
const root = resolve(import.meta.dirname, '..');
const promptPath = resolve(root, 'data/front-art-prompts.json');
const outputDir = resolve(root, process.env.FRONT_ART_SOURCE_DIR || '.front-art-source');
const apiKey = process.env.OPENAI_API_KEY;
const requested = process.argv.find((argument) => argument.startsWith('--front='))?.slice('--front='.length);
const overwrite = process.argv.includes('--overwrite');

if (!apiKey) throw new Error('OPENAI_API_KEY is required to generate front artwork. Existing assets can still be processed and validated without it.');

const prompts = JSON.parse(await readFile(promptPath, 'utf8'));
const selected = requested ? prompts.filter((entry) => entry.frontId === requested) : prompts;
if (requested && selected.length !== 1) throw new Error(`Unknown frontId: ${requested}`);
await mkdir(outputDir, { recursive: true });

const retryable = (status) => status === 429 || status >= 500;
const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));

async function generate(entry) {
  const output = resolve(outputDir, `${entry.frontId}.webp`);
  if (!overwrite) {
    try {
      if ((await stat(output)).size > 0) return { status: 'skipped', output };
    } catch {}
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    let response;
    try {
      response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          prompt: `${entry.prompt}\nAvoid: ${entry.negativePrompt}`,
          size: '1536x1024',
          quality: 'high',
          output_format: 'webp',
          output_compression: 85,
          background: 'opaque',
          n: 1
        })
      });
    } catch (error) {
      if (attempt === 2) throw error;
      await wait(1_000 * 2 ** attempt);
      continue;
    }

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      if (!retryable(response.status) || attempt === 2) throw new Error(`${entry.frontId}: image request failed (${response.status}): ${detail}`);
      await wait(1_000 * 2 ** attempt);
      continue;
    }

    const payload = await response.json();
    const result = payload.data?.[0];
    let bytes;
    if (result?.b64_json) bytes = Buffer.from(result.b64_json, 'base64');
    else if (result?.url) {
      const download = await fetch(result.url);
      if (!download.ok) throw new Error(`${entry.frontId}: generated image download failed (${download.status})`);
      bytes = Buffer.from(await download.arrayBuffer());
    }
    if (!bytes?.length) throw new Error(`${entry.frontId}: image response did not include an asset`);
    await writeFile(output, bytes);
    return { status: 'generated', output };
  }
  throw new Error(`${entry.frontId}: generation stopped after the retry limit`);
}

for (const [index, entry] of selected.entries()) {
  const result = await generate(entry);
  console.log(`[${index + 1}/${selected.length}] ${entry.frontId}: ${result.status}`);
}
