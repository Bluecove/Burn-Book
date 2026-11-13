// Turns the built app (dist/index.html) into a single preview page that can be
// shared as a link and opened on a phone, without deploying anything to GitHub.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist/index.html', 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
const keep = head
  .split('\n')
  .filter((l) => !/<meta charset|<meta name="viewport"|rel="manifest"|rel="icon"|rel="apple-touch-icon"/.test(l))
  .join('\n');
mkdirSync('preview', { recursive: true });
writeFileSync(
  'preview/burn-book.html',
  `<meta name="claude:viewport-fit-sides" content="cover">\n${keep}\n${body}\n`,
);
console.log('Wrote preview/burn-book.html');
