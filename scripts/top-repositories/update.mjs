import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { setTimeout } from 'node:timers/promises';
import { renderRepositoryCard } from './render.mjs';

export async function github(path) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const response = await fetch(`https://api.github.com${path}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2026-03-10',
        'User-Agent': 'top-repositories-card',
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
      signal: AbortSignal.timeout(20000),
    });
    if (response.status === 202) {
      await setTimeout(2000);
      continue;
    }
    if (response.status === 204) return [];
    if (!response.ok) throw new Error(`GitHub returned ${response.status} for ${path}`);
    return response.json();
  }
  throw new Error(`GitHub is still calculating statistics: ${path}. Run the workflow again later.`);
}

export async function collect(owner, request = github) {
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(owner)) throw new Error('Invalid GitHub username');
  const rows = [];
  for (const fullName of ['DariusHQ/fiverunner', 'boykopovar/AnyPS5']) {
    const path = `/repos/${fullName}`;
    const repo = await request(path);
    if (repo.private !== false) throw new Error(`Only public repositories are supported: ${fullName}`);
    const contributors = await request(`${path}/stats/contributors`);
    if (!Array.isArray(contributors)) throw new Error(`Invalid contributors for ${fullName}`);
    const author = contributors.find(person => person.author?.login?.toLowerCase() === owner.toLowerCase());
    let additions = author?.weeks.reduce((total, week) => total + week.a, 0) ?? 0;
    let deletions = author?.weeks.reduce((total, week) => total + week.d, 0) ?? 0;
    let contributions = author?.total ?? 0;
    // GitHub returns zero line counts above 10,000 commits; sum the author's individual commits instead.
    if (!author || (contributions > 0 && additions + deletions === 0)
      || contributors.reduce((total, person) => total + person.total, 0) >= 10000) {
      contributions = additions = deletions = 0;
      for (let page = 1; ; page++) {
        const commits = await request(`${path}/commits?sha=${encodeURIComponent(repo.default_branch)}&author=${owner}&per_page=100&page=${page}`);
        if (!Array.isArray(commits)) throw new Error(`Invalid commit list for ${fullName}`);
        for (const { sha } of commits) {
          if (!/^[a-f0-9]{40}$/i.test(sha)) throw new Error(`Invalid commit SHA for ${fullName}`);
          const commit = await request(`${path}/commits/${sha}`);
          if (commit.author?.login?.toLowerCase() !== owner.toLowerCase() || commit.parents.length > 1) continue;
          const { additions: added, deletions: removed } = commit.stats;
          if (![added, removed].every(value => Number.isSafeInteger(value) && value >= 0))
            throw new Error(`Invalid commit statistics for ${fullName}`);
          if (added + removed === 0 && !commit.files?.length) continue;
          contributions++;
          additions += added;
          deletions += removed;
        }
        if (commits.length < 100) break;
      }
    }
    const stars = repo.stargazers_count;
    const forks = repo.forks_count;
    for (const value of [contributions, additions, deletions, stars, forks])
      if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Invalid statistics for ${repo.name}`);
    rows.push({ name: repo.name, full_name: fullName, description: repo.description ?? '', language: repo.language,
      url: repo.html_url, stars, forks, contributions, additions, deletions });
  }
  return { owner, repositories: rows };
}

async function main() {
  const { values } = parseArgs({ options: {
    data: { type: 'string' }, output: { type: 'string', default: 'assets' },
  }});
  const data = values.data ? JSON.parse(await readFile(values.data, 'utf8'))
    : await collect(process.env.GITHUB_REPOSITORY_OWNER || 'DariusHQ');
  const output = resolve(values.output);
  const cards = data.repositories.map(repository => ({
    name: repository.name.toLowerCase(), svg: renderRepositoryCard({ owner: data.owner, repository }),
  }));
  await mkdir(output, { recursive: true });
  for (const card of cards) {
    if (!/^[a-z0-9_.-]+$/.test(card.name) || card.name === '.' || card.name === '..') throw new Error('Invalid output filename');
    const path = resolve(output, `${card.name}.svg`);
    await writeFile(`${path}.tmp`, card.svg, 'utf8');
    await rename(`${path}.tmp`, path);
  }
  console.log(`Updated ${data.repositories.length} independent cards in ${output}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
