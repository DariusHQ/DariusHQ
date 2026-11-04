import assert from 'node:assert/strict';
import { readFile, writeFile, rename } from 'node:fs/promises';

export async function publishCard(source, target, labels) {
  const svg = await readFile(source, 'utf8');
  assert.match(svg, /<svg\b/);
  assert.match(svg, /<\/svg>\s*$/);
  for (const label of labels) assert.ok(svg.includes(label), `Missing card label: ${label}`);
  const accessible = svg.replace(/<\/svg>\s*$/, '<style>@media (prefers-reduced-motion: reduce) { * { animation: none !important; opacity: 1 !important; } }</style></svg>\n');
  await writeFile(source, accessible, 'utf8');
  await rename(source, target);
}
