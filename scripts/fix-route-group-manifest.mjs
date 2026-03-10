#!/usr/bin/env node

import { copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const source = join(root, ".next", "server", "app", "page_client-reference-manifest.js");
const target = join(root, ".next", "server", "app", "(app)", "page_client-reference-manifest.js");

async function main() {
  if (!existsSync(source) || !existsSync(dirname(target)) || existsSync(target)) {
    return;
  }

  await copyFile(source, target);
  process.stdout.write("[manifest-fix] copied app/page_client-reference-manifest.js to app/(app)/\n");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
