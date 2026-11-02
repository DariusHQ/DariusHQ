import assert from 'node:assert/strict';
import { collect } from './update.mjs';

const repo = { name: 'project', private: false, fork: false, owner: { login: 'DariusHQ' },
  stargazers_count: 3, forks_count: 1, description: 'A project', language: 'TypeScript',
  html_url: 'https://github.com/DariusHQ/project' };
const contributors = [{ author: { login: 'dariushq' }, total: 2, weeks: [
  { a: 10, d: 3 }, { a: 5, d: 1 },
] }, { author: { login: 'someone-else' }, total: 99, weeks: [{ a: 900, d: 500 }] }];
const requested = [];
const request = async path => {
  requested.push(path);
  if (path.startsWith('/users/')) return [repo, { ...repo, name: 'private', private: true },
    { ...repo, name: 'fork', fork: true }, { ...repo, name: 'DariusHQ' }];
  return contributors;
};
const data = await collect('DariusHQ', request);
assert.equal(data.repositories.length, 1);
assert.deepEqual([data.repositories[0].contributions, data.repositories[0].additions,
  data.repositories[0].deletions], [2, 15, 4]);
assert.equal(requested.length, 2);
await assert.rejects(collect('invalid/user', request), /Invalid GitHub username/);
await assert.rejects(collect('DariusHQ', async path => path.startsWith('/users/') ? [repo]
  : [{ ...contributors[0], total: 10000 }]), /unavailable/);
await assert.rejects(collect('DariusHQ', async path => path.startsWith('/users/') ? [repo]
  : [{ ...contributors[0], weeks: [{ a: -1, d: 0 }] }]), /Invalid statistics/);
assert.deepEqual((await collect('DariusHQ', async path => path.startsWith('/users/') ? [repo] : []))
  .repositories.map(row => row.contributions), [0]);
console.log('Collector checks passed: owner attribution, privacy, totals, validation, large histories.');
