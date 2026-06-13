#!/usr/bin/env node
// Rewrite every package-lock "resolved" URL to the public npm registry, keeping
// integrity hashes intact. Run after `npm install` so the lockfile stays
// reachable from CI/Vercel even when local installs go through a private mirror.
//
//   npm run fix-lock   (or: node scripts/normalize-lockfile.mjs)
//
// Mirror-agnostic: it reconstructs each URL from the package name (lockfile key)
// and the tarball filename (the segment after "/-/"), so no registry host is
// hardcoded here.
import { readFileSync, writeFileSync } from "node:fs";

const PUBLIC = "https://registry.npmjs.org";
const path = "package-lock.json";
const lock = JSON.parse(readFileSync(path, "utf8"));
let changed = 0;

for (const [key, pkg] of Object.entries(lock.packages ?? {})) {
  if (!pkg.resolved || !pkg.resolved.includes("/-/")) continue;
  if (pkg.resolved.startsWith(`${PUBLIC}/`)) continue;
  const name = key.split("node_modules/").pop(); // e.g. "@vercel/blob"
  const file = pkg.resolved.split("/-/").pop(); // e.g. "blob-1.2.3.tgz"
  pkg.resolved = `${PUBLIC}/${name}/-/${file}`;
  changed++;
}

if (changed > 0) {
  writeFileSync(path, `${JSON.stringify(lock, null, 2)}\n`);
}
console.log(`normalize-lockfile: rewrote ${changed} resolved URL(s) to ${PUBLIC}`);
