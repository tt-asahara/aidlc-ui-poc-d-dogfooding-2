import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const file = join(import.meta.dir, "..", "dist", "claude", ".claude-plugin", "marketplace.json");
const marketplace = JSON.parse(readFileSync(file, "utf8"));
marketplace.name = "aidlc-pr-lens-local";
writeFileSync(file, `${JSON.stringify(marketplace, null, 2)}\n`);
