// Dependency-free validation of local links in the maintained documentation set.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const docs = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const target = join(directory, entry.name);
  return entry.isDirectory() ? docs(target) : entry.name.endsWith('.md') ? [target] : [];
});
const files = ['README.md', 'CONTRIBUTING.md', 'SECURITY.md', 'chain/README.md']
  .map((file) => resolve(root, file)).concat(docs(resolve(root, 'docs')));
const required = ['assets/solvex-banner.svg', 'assets/autopilot-paper-demo.png', '.github/workflows/ci.yml'];
const failures = required.filter((file) => !existsSync(resolve(root, file))).map((file) => `Missing ${file}`);
let checked = 0;
const withoutCode = (text) => text.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, '');
function anchors(file) {
  const text = withoutCode(readFileSync(file, 'utf8'));
  const seen = new Map();
  return new Set([...text.matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => {
    const base = match[1].trim().toLowerCase().replace(/[^\p{L}\p{N}_\-\s]/gu, '').replace(/\s/g, '-');
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    return count ? `${base}-${count}` : base;
  }));
}
for (const file of files) {
  const text = withoutCode(readFileSync(file, 'utf8'));
  const links = [...text.matchAll(/!?\[[^\]]*\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)/g)]
    .map((match) => match[1].replace(/^<|>$/g, ''));
  links.push(...[...text.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]));
  for (const href of links) {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) continue;
    if (href === '#') { failures.push(`${relative(root, file)}: empty placeholder link`); continue; }
    const [rawPath, fragment] = href.split('#');
    const target = rawPath ? resolve(dirname(file), decodeURIComponent(rawPath.split('?')[0])) : file;
    checked++;
    if (!existsSync(target)) { failures.push(`${relative(root, file)}: missing ${href}`); continue; }
    if (fragment && statSync(target).isFile() && extname(target) === '.md' && !anchors(target).has(decodeURIComponent(fragment))) {
      failures.push(`${relative(root, file)}: missing heading ${href}`);
    }
  }
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Documentation OK: ${files.length} Markdown files, ${checked} local links; required assets and CI present.`);
}
