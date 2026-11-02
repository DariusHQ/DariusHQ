import assert from 'node:assert/strict';
import { collect } from './update.mjs';

const repo = { name: 'fiverunner', private: false, default_branch: 'main',
  stargazers_count: 3, forks_count: 1, description: 'A project', language: 'TypeScript',
  html_url: 'https://github.com/DariusHQ/fiverunner' };
const contributors = [{ author: { login: 'dariushq' }, total: 2, weeks: [
  { a: 10, d: 3 }, { a: 5, d: 1 },
] }, { author: { login: 'someone-else' }, total: 99, weeks: [{ a: 900, d: 500 }] }];
const shas = ['a', 'b', 'c', 'd', 'e'].map(char => char.repeat(40));
const request = async path => {
  if (path === '/repos/DariusHQ/fiverunner') return repo;
  if (path === '/repos/boykopovar/AnyPS5') return { ...repo, name: 'AnyPS5' };
  if (path === '/repos/DariusHQ/fiverunner/stats/contributors') return contributors;
  if (path.endsWith('/stats/contributors')) return [
    { author: { login: 'DariusHQ' }, total: 1, weeks: [{ a: 0, d: 0 }] },
    { author: { login: 'someone-else' }, total: 20000, weeks: [{ a: 0, d: 0 }] },
  ];
  if (path.includes('/commits?')) return shas.map(sha => ({ sha }));
  const i = shas.indexOf(path.split('/').at(-1));
  assert.ok(i >= 0, path);
  return { author: { login: i === 1 ? 'someone-else' : 'DariusHQ' },
    parents: Array(i === 2 ? 2 : 1).fill({}),
    files: i === 3 ? [] : [{ filename: 'changed-file' }],
    stats: { additions: i >= 3 ? 0 : 8, deletions: i >= 3 ? 0 : 2 } };
};
const data = await collect('DariusHQ', request);
assert.deepEqual(data.repositories.map(row => row.name), ['fiverunner', 'AnyPS5']);
assert.deepEqual(data.repositories.map(row => [row.contributions, row.additions, row.deletions]),
  [[2, 15, 4], [2, 8, 2]]);
await assert.rejects(collect('invalid/user', request), /Invalid GitHub username/);
await assert.rejects(collect('DariusHQ', async path => path === '/repos/DariusHQ/fiverunner'
  ? { ...repo, private: true } : request(path)), /Only public/);
await assert.rejects(collect('DariusHQ', async path => path.endsWith('/stats/contributors')
  ? [{ ...contributors[0], weeks: [{ a: -1, d: 0 }] }] : request(path)), /Invalid statistics/);
console.log('Collector checks passed: explicit order, upstream contributions, accurate large-repo fallback, privacy and author attribution.');
