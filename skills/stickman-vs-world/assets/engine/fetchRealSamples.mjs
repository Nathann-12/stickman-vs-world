/**
 * Cross-Platform Real Studio Acoustic Sample Fetcher (`stickman-vs-world` v5).
 * Downloads 29 live-verified real acoustic recordings via Node fetch():
 *  - 17 Yamaha C5 Salamander Concert Grand Piano anchors (full 4-octave range C2 -> C6!)
 *  - 6 Real Studio Acoustic Drum Kit samples (kick, snare, hihat, tom1..3)
 *  - 2 Real Acoustic Bongos / Rims
 *  - 4 Real Berklee Studio Orchestral/Foley recordings (Gong, Bell, Chime, Plucked String)
 * Auto-locates ffmpeg (PATH or Remotion's bundled compositor) and decodes all 29 into
 * 44.1kHz 16-bit mono PCM WAV in `assets/samples/`.
 *
 * Usage: node scripts/fetch-real-samples.mjs
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const SAMPLES_DIR = path.resolve("assets/samples");
fs.mkdirSync(SAMPLES_DIR, { recursive: true });

function resolveFfmpeg() {
  const candidates = process.platform === "win32" ? ["ffmpeg.exe", "ffmpeg"] : ["ffmpeg"];
  for (const bin of candidates) {
    try {
      execFileSync(bin, ["-version"], { stdio: "ignore" });
      return bin;
    } catch {
      // try next
    }
  }
  const nm = path.resolve("node_modules/@remotion");
  if (fs.existsSync(nm)) {
    for (const entry of fs.readdirSync(nm)) {
      if (entry.startsWith("compositor-")) {
        const p = path.join(nm, entry, process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
        if (fs.existsSync(p)) return p;
      }
    }
  }
  throw new Error(
    "ffmpeg not found on PATH or inside node_modules/@remotion/compositor-*. Install ffmpeg or @remotion/cli first."
  );
}

const FFMPEG = resolveFfmpeg();

const PIANO_BASE = "https://tonejs.github.io/audio/salamander";
const DRUM_BASE = "https://tonejs.github.io/audio/drum-samples/acoustic-kit";
const BONGOS_BASE = "https://tonejs.github.io/audio/drum-samples/Bongos";
const BERKLEE_BASE = "https://tonejs.github.io/audio/berklee";

const DOWNLOADS = [
  // 17 Real Yamaha C5 Salamander Concert Grand Piano anchors (every 3 semitones: C2 -> C6)
  ...[
    "C2", "Ds2", "Fs2",
    "A2", "C3", "Ds3", "Fs3",
    "A3", "C4", "Ds4", "Fs4",
    "A4", "C5", "Ds5", "Fs5",
    "A5", "C6",
  ].map((n) => ({
    url: `${PIANO_BASE}/${n}.mp3`,
    out: `piano_${n}`,
  })),
  // 6 Real Studio Acoustic Drum Kit samples
  ...["kick", "snare", "hihat", "tom1", "tom2", "tom3"].map((d) => ({
    url: `${DRUM_BASE}/${d}.mp3`,
    out: `drum_${d}`,
  })),
  // 2 Real Acoustic Bongo / Rim percussion hits
  { url: `${BONGOS_BASE}/tom1.mp3`, out: "perc_wood_hi" },
  { url: `${BONGOS_BASE}/tom2.mp3`, out: "perc_wood_lo" },
  // 4 Real Berklee Studio Orchestral / Cinema Foley recordings (HTTP 200 verified!)
  { url: `${BERKLEE_BASE}/gong_1.mp3`, out: "orch_gong" },
  { url: `${BERKLEE_BASE}/bell_1.mp3`, out: "orch_bell" },
  { url: `${BERKLEE_BASE}/chime_1.mp3`, out: "orch_chime" },
  { url: `${BERKLEE_BASE}/pluck_1.mp3`, out: "orch_pluck" },
];

for (const item of DOWNLOADS) {
  const mp3Path = path.join(SAMPLES_DIR, `${item.out}.mp3`);
  const wavPath = path.join(SAMPLES_DIR, `${item.out}.wav`);
  if (fs.existsSync(wavPath)) continue;

  console.log(`Fetching ${item.out}...`);
  const res = await fetch(item.url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${item.url} (HTTP ${res.status})`);
  }
  fs.writeFileSync(mp3Path, Buffer.from(await res.arrayBuffer()));

  execFileSync(FFMPEG, [
    "-y",
    "-loglevel",
    "error",
    "-i",
    mp3Path,
    "-ar",
    "44100",
    "-ac",
    "1",
    "-c:a",
    "pcm_s16le",
    wavPath,
  ]);
  fs.unlinkSync(mp3Path);
}

console.log(`All ${DOWNLOADS.length} real studio acoustic samples ready in ${SAMPLES_DIR}!`);
