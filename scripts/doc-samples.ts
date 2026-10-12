// Keeps the TypeScript samples in the docs honest: every ```ts or ```tsx block in README.md and
// docs/**/*.md must appear verbatim in a file under docs/samples/, which `pnpm typecheck` compiles.
// A sample line may start with `declare `, so a doc can show a bare signature that a .ts file
// can only hold as an ambient declaration.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

export interface CodeBlock {
  line: number;
  code: string;
}

const FENCE = /^```(\w*)\s*$/;
const CHECKED = new Set(['ts', 'tsx']);

export function codeBlocks(markdown: string): CodeBlock[] {
  const lines = markdown.split('\n');
  const blocks: CodeBlock[] = [];
  let open: { lang: string; line: number; body: string[] } | undefined;
  lines.forEach((text, index) => {
    const fence = FENCE.exec(text);
    if (open === undefined) {
      if (fence !== null) open = { lang: fence[1] ?? '', line: index + 1, body: [] };
      return;
    }
    if (text.trimEnd() === '```') {
      if (CHECKED.has(open.lang)) blocks.push({ line: open.line, code: open.body.join('\n') });
      open = undefined;
      return;
    }
    open.body.push(text);
  });
  return blocks;
}

export function unsampledBlocks(
  blocks: readonly CodeBlock[],
  sources: readonly string[],
): CodeBlock[] {
  const bare = sources.map((source) => source.replace(/^declare /gm, ''));
  return blocks.filter((block) => !bare.some((source) => source.includes(block.code.trim())));
}

function files(dir: string, keep: (name: string) => boolean): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : files(path, keep);
    return entry.isFile() && keep(entry.name) ? [path] : [];
  });
}

/** One message per doc block that no sample contains. */
export function docSampleProblems(root: string): string[] {
  const docs = join(root, 'docs');
  const samples = files(join(docs, 'samples'), (name) => /\.tsx?$/.test(name)).map((path) =>
    readFileSync(path, 'utf8'),
  );
  const markdown = [join(root, 'README.md'), ...files(docs, (name) => name.endsWith('.md'))];
  return markdown.flatMap((path) =>
    unsampledBlocks(codeBlocks(readFileSync(path, 'utf8')), samples).map(
      (block) =>
        `${relative(root, path)}:${block.line}: code block is not in any docs/samples/ file`,
    ),
  );
}
