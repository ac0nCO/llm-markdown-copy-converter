import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

const requiredFiles = [
  "manifest.json",
  "background.js",
  "content.js",
  "content.css",
  "popup.html",
  "popup.js",
  "styles.css",
  "README.md",
  "CHANGELOG.md",
  "LICENSE"
];

for (const file of requiredFiles) {
  const fullPath = join(root, file);
  assert(existsSync(fullPath), `Missing required file: ${file}`);
}

const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
assert(manifest.manifest_version === 3, "manifest_version must be 3");
assert(Boolean(manifest.name), "manifest.name is required");
assert(Boolean(manifest.version), "manifest.version is required");
assert(Array.isArray(manifest.permissions), "manifest.permissions must be an array");
assert(Array.isArray(manifest.host_permissions), "manifest.host_permissions must be an array");
assert(manifest.background?.service_worker === "background.js", "background service worker must be background.js");

const content = readFileSync(join(root, "content.js"), "utf8");
const contentVersion = content.match(/window\.__mdccVersion\s*=\s*"([^"]+)"/)?.[1];
assert(contentVersion === manifest.version, `Version mismatch: manifest=${manifest.version}, content=${contentVersion}`);
assert(content.includes("extractSourcePlainText"), "content.js should keep source-text fallback logic");
assert(content.includes("materializeMathNodes"), "content.js should include math materialization logic");

for (const script of ["background.js", "content.js", "popup.js"]) {
  execFileSync("node", ["--check", join(root, script)], { stdio: "inherit" });
}

console.log(`Smoke check passed for ${manifest.name} v${manifest.version}`);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
