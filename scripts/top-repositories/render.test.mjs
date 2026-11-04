import assert from 'node:assert/strict';
import { renderRepositoryCard } from './render.mjs';

const repo = {
  name: 'A<&"'.repeat(30), description: '<script>alert("no")</script>', language: 'TypeScript',
  stars: 69, forks: 0, contributions: 506, additions: 52404, deletions: null,
};
const single = renderRepositoryCard({ owner: 'DariusHQ', repository: repo });
assert.match(single, /width="400" height="230"/);
assert.match(single, /\+52,404/);
assert.match(single, /A&lt;&amp;&quot;/);
assert.match(single, /&lt;script&gt;/);
assert.match(single, />506<\/text>/);
assert.match(single, />—<\/text>/);
assert.match(single, /…<\/text>/);
assert.equal((single.match(/>Contributions<\/text>/g) || []).length, 1);
assert.doesNotMatch(single, /<script>|foreignObject|<image|<animate|animation:[^;]*infinite/);
assert.equal((single.match(/<style>/g) || []).length, 1);
assert.match(single, /\.card-content \{ opacity: 1; transform: translateY\(0\); animation: card-in 750ms ease-out 1; \}/);
assert.match(single, /@media \(prefers-reduced-motion: reduce\) \{ \.card-content \{ animation: none; \} \}/);
assert.match(single, /<rect width="400" height="230" fill="#0d1117"\/>\s*<g class="card-content"/);
assert.throws(() => renderRepositoryCard({ owner: 'DariusHQ', repository: {} }), /repository with a name/);
assert.throws(() => renderRepositoryCard({ owner: ' ', repository: repo }), /owner/);
assert.match(renderRepositoryCard({ owner: '<&', repository: repo }), /&lt;&amp;/);
const zero = renderRepositoryCard({ owner: 'DariusHQ', repository: { ...repo, additions: 0, deletions: 0 } });
assert.match(zero, />\+0<\/text>/);
assert.match(zero, />−0<\/text>/);
console.log('Renderer checks passed.');
