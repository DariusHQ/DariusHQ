import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { setTimeout } from 'node:timers/promises';
import { renderCard } from './render.mjs';

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
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error(`Expected an array from GitHub: ${path}`);
    return data;
  }
  throw new Error(`GitHub is still calculating statistics: ${path}. Run the workflow again later.`);
}

export async function collect(owner, request = github) {
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(owner)) throw new Error('Invalid GitHub username');
  const repositories = [];
  for (let page = 1; ; page++) {
    const batch = await request(`/users/${owner}/repos?type=owner&per_page=100&page=${page}`);
    repositories.push(...batch);
    if (batch.length < 100) break;
  }
  const selected = repositories.filter(repo =>
    !repo.private && !repo.fork && repo.owner?.login?.toLowerCase() === owner.toLowerCase()
    && repo.name?.toLowerCase() !== owner.toLowerCase()
  ).sort((a, b) => b.stargazers_count - a.stargazers_count || a.name.localeCompare(b.name)).slice(0, 4);

  const rows = [];
  for (const repo of selected) {
    const contributors = await request(`/repos/${owner}/${encodeURIComponent(repo.name)}/stats/contributors`);
    // shortcut: GitHub omits line counts for very large histories; use git analysis if a repo reaches 10,000 commits.
    if (contributors.reduce((total, author) => total + author.total, 0) >= 10000)
      throw new Error(`Line counts are unavailable for ${repo.name}; keeping the previous card.`);
    const author = contributors.find(person => person.author?.login?.toLowerCase() === owner.toLowerCase());
    const additions = author?.weeks.reduce((total, week) => total + week.a, 0) ?? 0;
    const deletions = author?.weeks.reduce((total, week) => total + week.d, 0) ?? 0;
    const contributions = author?.total ?? 0;
    const stars = repo.stargazers_count;
    const forks = repo.forks_count;
    for (const value of [contributions, additions, deletions, stars, forks])
      if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Invalid statistics for ${repo.name}`);
    rows.push({ name: repo.name, description: repo.description ?? '', language: repo.language,
      url: repo.html_url, stars, forks, contributions, additions, deletions });
  }
  return { owner, repositories: rows };
}

async function main() {
  const { values } = parseArgs({ options: {
    data: { type: 'string' }, output: { type: 'string', default: 'assets/top-repositories.svg' },
  }});
  const data = values.data ? JSON.parse(await readFile(values.data, 'utf8'))
    : await collect(process.env.GITHUB_REPOSITORY_OWNER || 'DariusHQ');
  const output = resolve(values.output);
  const svg = renderCard(data);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(`${output}.tmp`, svg, 'utf8');
  await rename(`${output}.tmp`, output);
  console.log(`Updated ${output} with ${data.repositories.length} public repositories.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
