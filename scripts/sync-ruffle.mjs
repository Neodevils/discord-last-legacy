import { cp, mkdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "node_modules/@ruffle-rs/ruffle");
const target = resolve(root, "public/ruffle");

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

const candidates = [".", "web-selfhosted", "web"];
const selected = candidates.map((dir) => resolve(source, dir));
const ruffleDir = await selected.reduce(async (foundPromise, candidate) => {
  const found = await foundPromise;
  if (found) {
    return found;
  }
  return (await exists(resolve(candidate, "ruffle.js"))) ? candidate : null;
}, Promise.resolve(null));

if (!ruffleDir) {
  throw new Error("Ruffle web bundle not found in @ruffle-rs/ruffle.");
}

await mkdir(target, { recursive: true });
await cp(ruffleDir, target, { recursive: true, force: true });
console.log(`Copied Ruffle web bundle to ${target}`);
