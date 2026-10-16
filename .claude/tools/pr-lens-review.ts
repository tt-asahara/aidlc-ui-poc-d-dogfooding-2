#!/usr/bin/env bun
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const PIN = "7a9115c8202da4db030be5954ada8862e6135dce";
const DISCLAIMER = "semantic source/requirements/test comparison is an AI judgment, not a machine guarantee";
const root = resolve(import.meta.dir, "..", "..");
const cli = join(root, ".vendor", "pr-lens", "packages", "cli", "dist", "bin.js");
const argv = process.argv.slice(2); const command = argv.shift();
const flag = (name: string) => { const i = argv.indexOf(name); return i < 0 ? undefined : argv[i + 1]; };
const exec = (cmd: string, args: string[], encoding: BufferEncoding | "buffer" = "utf8") => {
  const r = spawnSync(cmd, args, { cwd: root, encoding: encoding === "buffer" ? null : encoding });
  if (r.status !== 0) throw new Error(String(r.stderr || r.stdout || `${cmd} failed`));
  return r.stdout as string | Buffer;
};
const hash = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const rel = (path: string) => relative(root, resolve(root, path)).replaceAll("\\", "/");
const excluded = /^(?:\.claude\/|\.vendor\/|\.pr-lens\/|product-plugins\/|aidlc\/|\.gitmodules$|\.gitignore$|docs\/pr-lens-integration\.md$)/;
const aidlcEvidence = /^aidlc\/spaces\/[^/]+\/intents\/(?!\.aidlc-engine(?:\/|$)).+/;
const nul = (data: Buffer) => data.toString("utf8").split("\0").filter(Boolean);
const fileInfo = (path: string, status: string) => {
  const absolute = join(root, path); const bytes = existsSync(absolute) ? readFileSync(absolute) : Buffer.alloc(0);
  return { path, status, binary: bytes.includes(0), size: bytes.length, sha256: `sha256:${hash(bytes)}` };
};
const snapshot = (base: string) => {
  const head = String(exec("git", ["rev-parse", "HEAD"])).trim();
  const changed = nul(exec("git", ["diff", "--name-only", "-z", "--find-renames", base, "--"], "buffer") as Buffer);
  const untracked = nul(exec("git", ["ls-files", "--others", "--exclude-standard", "-z"], "buffer") as Buffer);
  const all = [...new Set([...changed, ...untracked])].sort();
  const paths = all.filter((p) => !excluded.test(p));
  const files = paths.map((p) => fileInfo(p, untracked.includes(p) ? "untracked" : "changed"));
  const supportingEvidence = all.filter((p) => aidlcEvidence.test(p)).map((p) => fileInfo(p, untracked.includes(p) ? "untracked" : "changed"));
  return { head, changed, untracked, paths, files, supportingEvidence };
};

if (command === "prepare") {
  const base = flag("--base"); const out = resolve(root, flag("--out") ?? ".pr-lens/review-context.json");
  if (!base) throw new Error("prepare requires --base <commit>");
  exec("git", ["cat-file", "-e", `${base}^{commit}`]);
  const { head, untracked, paths, files, supportingEvidence } = snapshot(base);
  if (!paths.length) throw new Error("no application diff exists; refusing to review setup/harness changes as application code");
  const textPaths = files.filter((f) => !f.binary).map((f) => f.path);
  const trackedText = textPaths.filter((p) => !untracked.includes(p));
  const patches = trackedText.length ? String(exec("git", ["diff", "--find-renames", "--", base, "--", ...trackedText])) : "";
  const untrackedText = files.filter((f) => f.status === "untracked" && !f.binary).map((f) => `\n--- /dev/null\n+++ b/${f.path}\n@@ untracked file (${f.size} bytes) @@\n${readFileSync(join(root, f.path), "utf8")}`).join("\n");
  const preparedWorktreeHash = `sha256:${hash(JSON.stringify({ head, files }))}`;
  const context = { schemaVersion: 3, prLensSha: PIN, base, head, preparedWorktreeHash, files, supportingEvidence, boundaries: { applicationExcludes: [".claude/", ".vendor/", ".pr-lens/", "product-plugins/", "aidlc/", "integration setup files"], aidlcArtifacts: "supporting-evidence-only" }, binaryPolicy: "hash-and-metadata-only", diffSha256: `sha256:${hash(patches + untrackedText)}` };
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(context, null, 2)}\n`); writeFileSync(join(dirname(out), "application.diff"), patches + untrackedText);
  console.log(out);
} else if (command === "validate-render") {
  const graph = resolve(root, flag("--graph") ?? ".pr-lens/graph.json");
  if (!existsSync(cli)) throw new Error("pinned PR Lens is not built; run .claude/tools/setup-pr-lens.sh");
  if (String(exec("git", ["-C", join(root, ".vendor/pr-lens"), "rev-parse", "HEAD"])).trim() !== PIN) throw new Error("PR Lens source SHA mismatch");
  process.stdout.write(String(exec(process.execPath, [cli, "validate", graph]))); process.stdout.write(String(exec(process.execPath, [cli, "render", graph, "--theme", "light"])));
} else if (command === "verify-report") {
  const reportPath = resolve(root, flag("--report") ?? ""); const metadataPath = resolve(root, flag("--metadata") ?? ""); const contextPath = resolve(root, flag("--context") ?? ".pr-lens/review-context.json");
  for (const p of [reportPath, metadataPath, contextPath]) if (!existsSync(p)) throw new Error(`required review file missing: ${p}`);
  const report = readFileSync(reportPath, "utf8"); for (const h of ["## Scope and provenance", "## Findings", "## Diagram cross-check", "## Tests and limits"]) if (!report.includes(h)) throw new Error(`review report missing ${h}`);
  const context = JSON.parse(readFileSync(contextPath, "utf8")); const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
  if (metadata.schemaVersion !== 1 || metadata.prLensSha !== PIN) throw new Error("review metadata schema or PR Lens SHA mismatch");
  if (metadata.context.path !== rel(contextPath) || metadata.context.sha256 !== `sha256:${hash(readFileSync(contextPath))}` || metadata.context.preparedWorktreeHash !== context.preparedWorktreeHash) throw new Error("review metadata context mismatch");
  const expectedPaths = context.files.map((f: any) => f.path); if (JSON.stringify(metadata.reviewedPaths) !== JSON.stringify(expectedPaths)) throw new Error("reviewed paths do not exactly match prepared context");
  const current = snapshot(context.base);
  if (current.head !== context.head || JSON.stringify(current.files) !== JSON.stringify(context.files)) throw new Error("application HEAD/path set/content changed after prepare");
  if (`sha256:${hash(JSON.stringify({ head: current.head, files: current.files }))}` !== context.preparedWorktreeHash) throw new Error("application worktree hash changed after prepare");
  for (const key of ["graph", "renderManifest"]) { const item = metadata[key]; const p = resolve(root, item?.path ?? ""); if (!existsSync(p) || item.sha256 !== `sha256:${hash(readFileSync(p))}`) throw new Error(`${key} evidence mismatch`); }
  const graph = JSON.parse(readFileSync(resolve(root, metadata.graph.path), "utf8")); if (graph.provenance?.base?.sha !== context.base || graph.provenance?.head?.sha !== context.head) throw new Error("graph provenance does not match context");
  if (!Array.isArray(metadata.testEvidence) || !metadata.testEvidence.length) throw new Error("test evidence is required");
  for (const item of metadata.testEvidence) { const p = resolve(root, item.path); if (!existsSync(p) || item.sha256 !== `sha256:${hash(readFileSync(p))}`) throw new Error(`test evidence mismatch: ${item.path}`); }
  if (metadata.semanticCrossCheck?.performedBy !== "ai-reviewer" || metadata.semanticCrossCheck?.disclaimer !== DISCLAIMER) throw new Error("semantic cross-check disclaimer missing");
  console.log("review file integrity and provenance valid; semantic quality remains an AI judgment");
} else throw new Error("usage: pr-lens-review.ts <prepare|validate-render|verify-report>");
