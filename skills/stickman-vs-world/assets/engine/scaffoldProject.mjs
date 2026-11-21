/**
 * One-Command Verified Remotion + V5 Stickman Engine Project Scaffolder (`stickman-vs-world` v5).
 * Usage: node <path-to-skill>/assets/engine/scaffoldProject.mjs <target-dir> [composition-id]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetArg = process.argv[2];
const compId = process.argv[3] || "StickmanStory";

if (!targetArg) {
  console.error("Usage: node scaffoldProject.mjs <target-directory> [CompositionId]");
  process.exit(1);
}

const targetDir = path.resolve(targetArg);
const slug = path.basename(targetDir).toLowerCase().replace(/[^a-z0-9-]/g, "-");

for (const sub of ["src/engine", "src/story", "scripts", "public/sfx", "assets/samples"]) {
  fs.mkdirSync(path.join(targetDir, sub), { recursive: true });
}

// Copy all V5 TypeScript engine files
for (const f of ["ik.ts", "cameraEngine.ts", "rig.tsx", "poseEngine.ts", "timeline.ts"]) {
  fs.copyFileSync(path.join(__dirname, f), path.join(targetDir, "src/engine", f));
}
// Copy V5 Node scripts
fs.copyFileSync(path.join(__dirname, "fetchRealSamples.mjs"), path.join(targetDir, "scripts/fetch-real-samples.mjs"));
fs.copyFileSync(path.join(__dirname, "audioMixerTemplate.mjs"), path.join(targetDir, "scripts/audioMixerTemplate.mjs"));
fs.copyFileSync(path.join(__dirname, "auditChoreography.mjs"), path.join(targetDir, "scripts/auditChoreography.mjs"));

// Copy starter Zero-HUD CompositionTemplate into src/story/MainComposition.tsx
const tpl = fs
  .readFileSync(path.join(__dirname, "CompositionTemplate.tsx"), "utf8")
  .replaceAll('from "./', 'from "../engine/');
fs.writeFileSync(path.join(targetDir, "src/story/MainComposition.tsx"), tpl);

fs.writeFileSync(
  path.join(targetDir, "package.json"),
  JSON.stringify(
    {
      name: slug,
      version: "1.0.0",
      description: `${compId} — Stickman vs. World (v5 Silent-Film Cinema Edition)`,
      private: true,
      dependencies: {
        "@remotion/cli": "4.0.545",
        "@remotion/media": "4.0.545",
        react: "19.3.1",
        "react-dom": "19.3.1",
        remotion: "4.0.545",
      },
      devDependencies: {
        "@types/react": "19.3.0",
        typescript: "5.9.3",
      },
      scripts: {
        dev: "remotion studio",
        build: "remotion bundle",
      },
    },
    null,
    2
  ) + "\n"
);

fs.writeFileSync(
  path.join(targetDir, "tsconfig.json"),
  JSON.stringify(
    {
      compilerOptions: {
        target: "ES2018",
        module: "Preserve",
        moduleResolution: "Bundler",
        jsx: "react-jsx",
        strict: true,
        noEmit: true,
        lib: ["es2015", "dom"],
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        noUnusedLocals: true,
      },
      exclude: ["remotion.config.ts"],
    },
    null,
    2
  ) + "\n"
);

fs.writeFileSync(
  path.join(targetDir, "remotion.config.ts"),
  `import { Config } from "@remotion/cli/config";\n\nConfig.setRspack(true);\nConfig.setVideoImageFormat("jpeg");\nConfig.setOverwriteOutput(true);\nConfig.setDefaultPremountInSeconds(2);\n`
);

fs.writeFileSync(
  path.join(targetDir, "src/Root.tsx"),
  `import React from "react";\nimport { Composition } from "remotion";\nimport {\n  COMP_DURATION_FRAMES,\n  COMP_FPS,\n  COMP_HEIGHT,\n  COMP_WIDTH,\n  MainComposition,\n} from "./story/MainComposition";\n\nexport const RemotionRoot: React.FC = () => (\n  <Composition\n    id="${compId}"\n    component={MainComposition}\n    durationInFrames={COMP_DURATION_FRAMES}\n    fps={COMP_FPS}\n    width={COMP_WIDTH}\n    height={COMP_HEIGHT}\n  />\n);\n`
);

fs.writeFileSync(
  path.join(targetDir, "src/index.ts"),
  `import { registerRoot } from "remotion";\nimport { RemotionRoot } from "./Root";\n\nregisterRoot(RemotionRoot);\n`
);

console.log(`Scaffolded v5 Stickman Cinema project at: ${targetDir}`);
console.log(`Next steps:\n  cd "${targetDir}"\n  npm install --no-audit --no-fund\n  node scripts/fetch-real-samples.mjs\n  npx tsc --noEmit`);
