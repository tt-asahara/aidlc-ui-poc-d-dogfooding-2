import { describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const product = join(import.meta.dir, "..", "..", "..");
const tool = join(product, ".claude", "tools", "pr-lens-review.ts");
const hash = (p: string) => `sha256:${createHash("sha256").update(readFileSync(p)).digest("hex")}`;
const run = (cwd: string, args: string[]) => spawnSync(process.execPath, [join(cwd, ".claude", "tools", "pr-lens-review.ts"), ...args], { cwd, encoding: "utf8" });

function repo() {
  const root = mkdtempSync(join(tmpdir(), "pr-lens-product-test-"));
  mkdirSync(join(root, ".claude", "tools"), { recursive: true }); cpSync(tool, join(root, ".claude", "tools", "pr-lens-review.ts"));
  spawnSync("git", ["init", "-q"], { cwd: root }); spawnSync("git", ["config", "user.email", "test@example.com"], { cwd: root }); spawnSync("git", ["config", "user.name", "Test"], { cwd: root });
  writeFileSync(join(root, "base.txt"), "base\n"); spawnSync("git", ["add", "."], { cwd: root }); spawnSync("git", ["commit", "-qm", "base"], { cwd: root });
  return root;
}

describe("project-local PR Lens review", () => {
  test("prepare preserves NUL-delimited space/Japanese paths and records binary as metadata only", () => {
    const root = repo(); const base = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim();
    writeFileSync(join(root, "space name.txt"), "hello\n"); writeFileSync(join(root, "日本語.txt"), "world\n"); writeFileSync(join(root, "image.bin"), Buffer.from([0, 1, 2, 255]));
    const result = run(root, ["prepare", "--base", base]); expect(result.status).toBe(0);
    const context = JSON.parse(readFileSync(join(root, ".pr-lens", "review-context.json"), "utf8"));
    expect(context.files.map((f: any) => f.path)).toEqual(["image.bin", "space name.txt", "日本語.txt"]);
    expect(context.files.find((f: any) => f.path === "image.bin")).toMatchObject({ binary: true, size: 4 });
    expect(readFileSync(join(root, ".pr-lens", "application.diff"), "utf8")).not.toContain("image.bin");
  });

  test("report verification binds context, paths, graph, manifest, tests, and detects later source mutation", () => {
    const root = repo(); const base = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim(); writeFileSync(join(root, "app.ts"), "export const x = 1;\n");
    expect(run(root, ["prepare", "--base", base]).status).toBe(0); const contextPath = join(root, ".pr-lens", "review-context.json"); const context = JSON.parse(readFileSync(contextPath, "utf8"));
    const graphPath = join(root, ".pr-lens", "graph.json"); const manifestPath = join(root, ".pr-lens", "manifest.json"); const testPath = join(root, ".pr-lens", "tests.txt");
    writeFileSync(graphPath, JSON.stringify({ provenance: { base: { sha: context.base }, head: { sha: context.head } } })); writeFileSync(manifestPath, "{}\n"); writeFileSync(testPath, "1 passed\n");
    const reportPath = join(root, ".pr-lens", "review.md"); writeFileSync(reportPath, "## Scope and provenance\n## Findings\n## Diagram cross-check\n## Tests and limits\n");
    const metadataPath = join(root, ".pr-lens", "review.json"); writeFileSync(metadataPath, JSON.stringify({ schemaVersion: 1, prLensSha: "7a9115c8202da4db030be5954ada8862e6135dce", context: { path: ".pr-lens/review-context.json", sha256: hash(contextPath), preparedWorktreeHash: context.preparedWorktreeHash }, reviewedPaths: ["app.ts"], graph: { path: ".pr-lens/graph.json", sha256: hash(graphPath) }, renderManifest: { path: ".pr-lens/manifest.json", sha256: hash(manifestPath) }, testEvidence: [{ path: ".pr-lens/tests.txt", sha256: hash(testPath) }], semanticCrossCheck: { performedBy: "ai-reviewer", disclaimer: "semantic source/requirements/test comparison is an AI judgment, not a machine guarantee" } }));
    expect(run(root, ["verify-report", "--context", ".pr-lens/review-context.json", "--report", ".pr-lens/review.md", "--metadata", ".pr-lens/review.json"]).status).toBe(0);
    writeFileSync(join(root, "app.ts"), "export const x = 2;\n"); expect(run(root, ["verify-report", "--context", ".pr-lens/review-context.json", "--report", ".pr-lens/review.md", "--metadata", ".pr-lens/review.json"]).status).not.toBe(0);
  });

  test("formal contribution survives a clean recompose", () => {
    const root = mkdtempSync(join(tmpdir(), "pr-lens-compose-test-")); cpSync(join(product, ".claude"), join(root, ".claude"), { recursive: true });
    const stage = join(root, ".claude", "aidlc-common", "stages", "construction", "build-and-test.md"); writeFileSync(stage, readFileSync(stage, "utf8").replace(/\n?<!-- plugin:pr-lens-review:[\s\S]*?<!-- \/plugin:pr-lens-review:[^\n]*-->\n?/g, "\n"));
    for (const f of ["plugin-compose-pr-lens-review.json", "plugin-contrib-pr-lens-review.json", "plugin-owned-pr-lens-review.json"]) rmSync(join(root, ".claude", "tools", "data", f), { force: true });
    const compose = join(product, "product-plugins", "pr-lens-review", "dist", "claude", "hooks", "compose.ts"); const result = spawnSync(process.execPath, [compose], { cwd: root, encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root, AIDLC_HARNESS_DIR: ".claude", AIDLC_HARNESS_NAME: "claude" } });
    expect(result.status).toBe(0); expect(readFileSync(stage, "utf8")).toContain("plugin:pr-lens-review:before-step:11"); expect(existsSync(join(root, ".claude", "tools", "pr-lens-review.ts"))).toBe(true);
  });
});
