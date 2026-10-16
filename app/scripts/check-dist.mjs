#!/usr/bin/env node
/**
 * ビルドの出力（dist/）の検査（NFR3.1、NFR3.2。インフラ設計 cicd-pipeline.md「ビルドの出力の検査」）。
 *
 * 1. dist/index.html に CSP の meta 要素が1つあり、中身が csp-policy.json の指定と同じ。
 * 2. dist/index.html の src と href が、外部（http://・https://・//）と data: で始まらない。
 * 3. dist/ の CSS の url() と @import の行き先が同じ条件を満たす。
 * 4. dist/ の JS の動的な読み込み（import()）の行き先が同じ条件を満たす。
 *
 * JS の中の文字列全体は調べない。React DOM の出力には読み込みに使われない URL の文字列
 * （http://www.w3.org/2000/svg など）が含まれるため（security-design.md の NFR3.2）。
 */
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(appDir, 'dist');

const FORBIDDEN_TARGET = /^(?:https?:|\/\/|data:)/i;

function decodeHtmlEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

function isForbidden(target) {
  return FORBIDDEN_TARGET.test(target.trim());
}

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath ?? entry.path, entry.name));
}

/** タグの属性を取り出す（name="value"、name='value'、name=value）。 */
function readAttributes(tagSource) {
  const attributes = [];
  const pattern = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  for (const match of tagSource.matchAll(pattern)) {
    attributes.push({
      name: match[1].toLowerCase(),
      value: decodeHtmlEntities(match[2] ?? match[3] ?? match[4] ?? ''),
    });
  }
  return attributes;
}

function checkIndexHtml(html, expectedCsp, problems) {
  const tags = [...html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)];
  const cspMetas = tags.filter(([, name, rest]) => {
    if (name.toLowerCase() !== 'meta') return false;
    return readAttributes(rest).some(
      (attr) =>
        attr.name === 'http-equiv' && attr.value.toLowerCase() === 'content-security-policy',
    );
  });
  if (cspMetas.length !== 1) {
    problems.push(
      `index.html: CSP の meta 要素が ${cspMetas.length} 個あります（1個である必要があります）`,
    );
  } else {
    const content = readAttributes(cspMetas[0][2]).find((attr) => attr.name === 'content')?.value;
    if (content !== expectedCsp) {
      problems.push(
        `index.html: CSP の指定が設計と違います\n  期待: ${expectedCsp}\n  実際: ${content ?? '（content なし）'}`,
      );
    }
  }

  for (const [, name, rest] of tags) {
    for (const attr of readAttributes(rest)) {
      if ((attr.name === 'src' || attr.name === 'href') && isForbidden(attr.value)) {
        problems.push(
          `index.html: <${name} ${attr.name}="${attr.value}"> は外部か data: の読み込み先です`,
        );
      }
    }
  }
  return cspMetas.length;
}

function checkCss(file, css, problems) {
  const targets = [];
  for (const match of css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi)) {
    targets.push(match[1] ?? match[2] ?? match[3] ?? '');
  }
  for (const match of css.matchAll(/@import\s+(?:url\()?\s*["']?([^"')\s;]+)/gi)) {
    targets.push(match[1]);
  }
  for (const target of targets) {
    if (isForbidden(target)) {
      problems.push(`${file}: CSS の読み込み先「${target}」は外部か data: です`);
    }
  }
  return targets.length;
}

function checkJs(file, js, problems) {
  let count = 0;
  for (const match of js.matchAll(/\bimport\(\s*(["'`])([^"'`]+)\1\s*\)/g)) {
    count += 1;
    if (isForbidden(match[2])) {
      problems.push(`${file}: 動的な読み込み import("${match[2]}") は外部か data: です`);
    }
  }
  return count;
}

async function main() {
  const policy = JSON.parse(await readFile(join(appDir, 'csp-policy.json'), 'utf8'));
  const expectedCsp = policy.directives.join('; ');
  const problems = [];

  let files;
  try {
    files = await listFiles(distDir);
  } catch (error) {
    console.error(
      `dist/ を読めません。先に npm run build を実行してください（${error.code ?? error}）`,
    );
    process.exit(1);
  }

  const indexPath = join(distDir, 'index.html');
  if (!files.includes(indexPath)) {
    console.error('dist/index.html がありません。先に npm run build を実行してください');
    process.exit(1);
  }
  checkIndexHtml(await readFile(indexPath, 'utf8'), expectedCsp, problems);

  let cssTargets = 0;
  let jsImports = 0;
  for (const file of files) {
    const name = relative(appDir, file);
    if (file.endsWith('.css')) {
      cssTargets += checkCss(name, await readFile(file, 'utf8'), problems);
    } else if (/\.(?:m?js)$/.test(file)) {
      jsImports += checkJs(name, await readFile(file, 'utf8'), problems);
    }
  }

  if (problems.length > 0) {
    console.error('ビルドの出力の検査に失敗しました:');
    for (const problem of problems) {
      console.error(`- ${problem}`);
    }
    process.exit(1);
  }
  console.log(
    `ビルドの出力の検査に合格しました（CSP の指定が一致、CSS の読み込み先 ${cssTargets} 件・JS の動的な読み込み ${jsImports} 件に外部と data: なし）`,
  );
}

await main();
