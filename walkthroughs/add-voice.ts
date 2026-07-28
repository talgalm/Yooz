/**
 * Post-processing script: adds Hebrew voice narration to walkthrough videos.
 *
 * Usage:
 *   npx tsx walkthroughs/add-voice.ts <video.webm> <narration.json> [output.mp4]
 *
 * Cross-platform TTS:
 *   - macOS: uses `say -v Carmit` (built-in Hebrew voice)
 *   - Linux: uses `espeak-ng` if installed, else Google Translate TTS
 *   - Windows: Google Translate TTS (no built-in Hebrew CLI voice)
 *
 * ffmpeg/ffprobe are bundled via ffmpeg-static/ffprobe-static — no system install required.
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import https from 'https';
import path from 'path';
import os from 'os';
import ffmpegBin from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

const PATH_ENV = `${process.env.PATH}:/opt/homebrew/bin:/usr/local/bin`;
const env = { ...process.env, PATH: PATH_ENV };

const isMac = os.platform() === 'darwin';
const isWindows = os.platform() === 'win32';

// Bundled binaries so this works without ffmpeg/ffprobe on the system PATH (esp. on Windows).
const FFMPEG = `"${ffmpegBin}"`;
const FFPROBE = `"${(ffprobeStatic as unknown as { path: string }).path}"`;

interface Segment {
  text: string;
  timestampMs: number;
}

const videoPath = process.argv[2];
const narrationPath = process.argv[3];
const outputPath = process.argv[4] || videoPath.replace(/\.webm$/, '-narrated.mp4');

if (!videoPath || !narrationPath) {
  console.error('Usage: npx tsx walkthroughs/add-voice.ts <video.webm> <narration.json> [output.mp4]');
  process.exit(1);
}

const segments: Segment[] = JSON.parse(readFileSync(narrationPath, 'utf-8'));
if (segments.length === 0) {
  console.error('No narration segments found.');
  process.exit(1);
}

// Unique temp dir per invocation. A shared '.narration-tmp' collides when two videos are
// narrated concurrently — one process's cleanup wipes the other's clips mid-encode, so the
// loser silently falls back to an un-narrated video. Base it on the output name + pid.
const outBase = path.basename(outputPath).replace(/\.[^.]+$/, '');
const tmpDir = path.join(path.dirname(outputPath), `.narration-tmp-${outBase}-${process.pid}`);
if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
mkdirSync(tmpDir, { recursive: true });

// --- TTS functions ---

function generateTTSMac(text: string, outputFile: string) {
  const safeText = text.replace(/"/g, '\\"');
  const aiffFile = outputFile.replace(/\.wav$/, '.aiff');
  execSync(`say -v Carmit -r 160 -o "${aiffFile}" "${safeText}"`, { env });
  execSync(`${FFMPEG} -y -i "${aiffFile}" "${outputFile}"`, { env, stdio: 'ignore' });
}

function generateTTSLinux(text: string, outputFile: string): Promise<void> {
  // Try espeak-ng first (better quality, often pre-installed)
  try {
    execSync('which espeak-ng', { env, stdio: 'ignore' });
    const safeText = text.replace(/"/g, '\\"');
    execSync(`espeak-ng -v he -s 140 -w "${outputFile}" "${safeText}"`, { env });
    return Promise.resolve();
  } catch {
    // Fall back to Google Translate TTS (free, no API key)
    return downloadGoogleTTS(text, outputFile);
  }
}

function downloadGoogleTTS(text: string, outputFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const encodedText = encodeURIComponent(text);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=he&client=tw-ob&ttsspeed=0.8`;

    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        // Follow redirect
        https.get(res.headers.location!, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res2) => {
          const chunks: Buffer[] = [];
          res2.on('data', (chunk) => chunks.push(chunk));
          res2.on('end', () => {
            const mp3File = outputFile.replace(/\.wav$/, '.mp3');
            writeFileSync(mp3File, Buffer.concat(chunks));
            execSync(`${FFMPEG} -y -i "${mp3File}" "${outputFile}"`, { env, stdio: 'ignore' });
            resolve();
          });
          res2.on('error', reject);
        });
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const mp3File = outputFile.replace(/\.wav$/, '.mp3');
        writeFileSync(mp3File, Buffer.concat(chunks));
        execSync(`${FFMPEG} -y -i "${mp3File}" "${outputFile}"`, { env, stdio: 'ignore' });
        resolve();
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

// --- Main ---

async function main() {
  const engineLabel = isMac ? 'macOS say' : isWindows ? 'Google Translate TTS' : 'Linux TTS';
  console.log(`\n🎙️  Generating ${segments.length} Hebrew voice clips (${engineLabel})...`);

  const audioFiles: { file: string; offsetMs: number }[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const wavFile = path.join(tmpDir, `seg_${i}.wav`);

    if (isMac) {
      generateTTSMac(seg.text, wavFile);
    } else if (isWindows) {
      // No built-in Hebrew CLI voice on Windows — go straight to the Google Translate fallback.
      await downloadGoogleTTS(seg.text, wavFile);
    } else {
      await generateTTSLinux(seg.text, wavFile);
    }

    audioFiles.push({ file: wavFile, offsetMs: seg.timestampMs });
    console.log(`  ✅ Clip ${i + 1}: "${seg.text.substring(0, 40)}..." @ ${(seg.timestampMs / 1000).toFixed(1)}s`);
  }

  // Get video duration
  const durationStr = execSync(
    `${FFPROBE} -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`,
    { env },
  ).toString().trim();
  const videoDuration = parseFloat(durationStr);
  console.log(`\n🎬 Video duration: ${videoDuration.toFixed(1)}s`);

  // Build ffmpeg command
  let inputs = `-i "${videoPath}" -f lavfi -t ${videoDuration} -i anullsrc=r=44100:cl=stereo`;
  let filterParts: string[] = [];

  for (let i = 0; i < audioFiles.length; i++) {
    const af = audioFiles[i];
    inputs += ` -i "${af.file}"`;
    filterParts.push(`[${i + 2}]adelay=${af.offsetMs}|${af.offsetMs}[a${i}]`);
  }

  let mixInputs = '[1]';
  for (let i = 0; i < audioFiles.length; i++) {
    mixInputs += `[a${i}]`;
  }
  const mixCount = audioFiles.length + 1;
  filterParts.push(`${mixInputs}amix=inputs=${mixCount}:duration=first:dropout_transition=0[aout]`);

  const filterComplex = filterParts.join(';');

  console.log('\n🔧 Merging video + voice...');

  const outDir = path.dirname(outputPath);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const cmd = `${FFMPEG} -y ${inputs} -filter_complex "${filterComplex}" -map 0:v -map "[aout]" -c:v libx264 -preset fast -crf 23 -c:a aac -shortest "${outputPath}"`;

  try {
    execSync(cmd, { env, stdio: 'inherit' });
    console.log(`\n✅ Narrated video saved: ${outputPath}\n`);
  } catch (e) {
    console.error('\n❌ ffmpeg failed. Command was:');
    console.error(cmd);
    process.exit(1);
  }

  // Cleanup
  rmSync(tmpDir, { recursive: true });
}

main();
