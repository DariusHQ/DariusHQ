import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { publishCard } from './publish.mjs';

const directory = await mkdtemp(join(tmpdir(), 'profile-card-'));
const source = join(directory, 'candidate.svg');
const target = join(directory, 'cached.svg');
try {
  await writeFile(target, 'last valid image');
  for (const invalid of ['<html>Application Error</html>', '<svg>Error</svg>', '<svg><text>Most Used Languages</text>']) {
    await writeFile(source, invalid);
    await assert.rejects(publishCard(source, target, ['Most Used Languages']));
    assert.equal(await readFile(target, 'utf8'), 'last valid image');
  }
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><svg><text>Most Used Languages</text></svg></svg>';
  await writeFile(source, svg);
  await publishCard(source, target, ['Most Used Languages']);
  const published = await readFile(target, 'utf8');
  assert.ok(published.startsWith(svg.slice(0, -6)));
  assert.match(published, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(published, /animation: none !important; opacity: 1 !important/);
  assert.equal((published.match(/<\/svg>/g) || []).length, 2);
  await assert.rejects(readFile(source), { code: 'ENOENT' });
} finally {
  assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
  await rm(directory, { recursive: true, force: true });
}
console.log('Card publication checks passed.');
