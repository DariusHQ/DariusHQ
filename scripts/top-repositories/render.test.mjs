import assert from 'node:assert/strict';
import { renderCard } from './render.mjs';

const repo = {
  name: 'A<&"'.repeat(30), description: '<script>alert("no")</script>', language: 'TypeScript',
  stars: 69, forks: 0, contributions: 506, additions: 52404, deletions: null,
};
const svg = renderCard({ owner: 'DariusHQ', repositories: [repo, { ...repo, name: 'Second' }] });
assert.match(svg, /width="820" height="476"/);
assert.match(svg, /Top repositories:/);
assert.match(svg, /\+52,404/);
assert.match(svg, />506<\/text>/);
assert.match(svg, />—<\/text>/);
assert.match(svg, /A&lt;&amp;&quot;/);
assert.match(svg, /&lt;script&gt;/);
assert.doesNotMatch(svg, /<script>|foreignObject|<image|<style/);
assert.equal((svg.match(/>Contributions<\/text>/g) || []).length, 2);
assert.match(renderCard({ owner: 'DariusHQ', repositories: Array(4).fill(repo) }), /height="824"/);
assert.match(renderCard({ owner: 'DariusHQ', repositories: [] }), /No public repositories found/);
assert.throws(() => renderCard({ owner: 'DariusHQ', repositories: [{}] }), /repository needs a name/);
assert.match(renderCard({ owner: '<&', repositories: [] }), /&lt;&amp;/);
console.log('Renderer checks passed.');
