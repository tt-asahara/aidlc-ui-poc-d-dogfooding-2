#!/usr/bin/env bun
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dir, "..", "..");
const cli = join(root, ".vendor", "pr-lens", "packages", "cli", "dist", "bin.js");
const args = process.argv.slice(2);
const command = args.shift();
const value = (flag: string) => { const i = args.indexOf(flag); return i < 0 ? undefined : args[i + 1]; };
const run = (cmd: string, argv: string[], cwd = root) => {
  const out = spawnSync(cmd, argv, { cwd, encoding: "utf8" });
  if (out.status !== 0) throw new Error(out.stderr || out.stdout || `${cmd} failed`);
  return out.stdout.trim();
};
const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");
const excluded = /^(?:\.claude\/|\.vendor\/|\.pr-lens\/|\.gitmodules$|\.gitignore$|docs\/pr-lens-integration\.md$|aidlc\/(?:\.aidlc-sessions|spaces\/[^/]+\/intents\/\.aidlc-engine)\/)/;

if (command === "prepare") {
  const base = value("--base");
  const outPath = resolve(root, value("--out") ?? ".pr-lens/review-context.json");
  if (!base) throw new Error("prepare requires --base <commit>");
  run("git", ["cat-file", "-e", `${base}^{commit}`]);
  const head = run("git", ["rev-parse", "HEAD"]);
  const status = run("git", ["status", "--porcelain=v1", "--untracked-files=all"]);
  const names = run("git", ["diff", "--name-only", "--find-renames", base, "--"])
    .split("\n").filter(Boolean).filter((path) => !excluded.test(path));
  const untracked = status.split("\n").filter((line) => line.startsWith("?? "))
    .map((line) => line.slice(3)).filter((path) => !excluded.test(path));
  const paths = [...new Set([...names, ...untracked])].sort();
  if (!paths.length) throw new Error("no application diff exists; refusing to review setup/harness changes as application code");
  const trackedDiff = run("git", ["diff", "--find-renames", "--binary", base, "--", ...paths]);
  const untrackedDiff = untracked.filter((path) => paths.includes(path)).map((path) => {
    const bytes = readFileSync(join(root, path));
    return `\n--- /dev/null\n+++ b/${path}\n@@ untracked file (${bytes.length} bytes) @@\n${bytes.toString("utf8")}`;
  }).join("\n");
  const diff = `${trackedDiff}${untrackedDiff}`;
  const worktreeHash = sha256(`${head}\n${status}\n${diff}\n${paths.join("\n")}`);
  const context = { schemaVersion: 1, base, head, worktreeHash: `sha256:${worktreeHash}`, paths, exclusions: [".claude/", ".vendor/", ".pr-lens/", "AI-DLC engine/session state"], diffSha256: `sha256:${sha256(diff)}` };
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(context, null, 2)}\n`);
  writeFileSync(join(dirname(outPath), "application.diff"), diff);
  console.log(outPath);
} else if (command === "validate-render") {
  const graph = resolve(root, value("--graph") ?? ".pr-lens/graph.json");
  if (!existsSync(cli)) throw new Error("pinned PR Lens is not built; run .claude/tools/setup-pr-lens.sh");
  if (!existsSync(graph)) throw new Error(`graph missing: ${graph}`);
  process.stdout.write(run(process.execPath, [cli, "validate", graph]) + "\n");
  process.stdout.write(run(process.execPath, [cli, "render", graph, "--theme", "light"]) + "\n");
} else if (command === "verify-report") {
  const report = resolve(root, value("--report") ?? "");
  const context = resolve(root, value("--context") ?? ".pr-lens/review-context.json");
  if (!existsSync(report) || !existsSync(context)) throw new Error("verify-report requires existing --report and --context files");
  const text = readFileSync(report, "utf8");
  for (const heading of ["## Scope and provenance", "## Findings", "## Diagram cross-check", "## Tests and limits"]) {
    if (!text.includes(heading)) throw new Error(`review report missing ${heading}`);
  }
  const metadata = JSON.parse(readFileSync(context, "utf8"));
  for (const fact of [metadata.base, metadata.head, metadata.worktreeHash]) {
    if (!text.includes(fact)) throw new Error(`review report missing provenance ${fact}`);
  }
  console.log("review report contract valid");
} else {
  throw new Error("usage: pr-lens-review.ts <prepare|validate-render|verify-report> [options]");
}
