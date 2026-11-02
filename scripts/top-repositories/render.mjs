const colors = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572a5',
  'C++': '#f34b7d', Lua: '#000080', CSS: '#663399', HTML: '#e34c26',
  Rust: '#dea584', Go: '#00add8', Java: '#b07219', 'C#': '#178600',
};
const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
})[char]);
const shorten = (value, limit) => {
  const chars = Array.from(String(value ?? '').replace(/\s+/g, ' ').trim());
  return escape(chars.length > limit ? `${chars.slice(0, limit - 1).join('')}…` : chars.join(''));
};
const count = (value, prefix = '') => Number.isSafeInteger(value) && value >= 0
  ? `${prefix}${value.toLocaleString('en-US')}` : '—';

const repositoryIcon = '<path d="M3 2.5h10v13H3a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z M1 12.5a2 2 0 0 1 2-2h10 M5 2.5v5l2-1.2L9 7.5v-5"/>';
const starIcon = '<path d="m8 1 2.1 4.3 4.8.7-3.5 3.4.8 4.8L8 12l-4.2 2.2.8-4.8L1.1 6l4.8-.7Z"/>';
const forkIcon = '<circle cx="4" cy="3" r="2"/><circle cx="12" cy="3" r="2"/><circle cx="8" cy="13" r="2"/><path d="M4 5v1.5A2.5 2.5 0 0 0 6.5 9H8m4-4v1.5A2.5 2.5 0 0 1 9.5 9H8v2"/>';

export function renderCard({ owner, repositories }) {
  if (typeof owner !== 'string' || !owner.trim() || !Array.isArray(repositories)) {
    throw new TypeError('owner and repositories are required');
  }
  const height = 128 + Math.max(1, repositories.length) * 174;
  const rows = repositories.map((repo, index) => {
    if (!repo || typeof repo.name !== 'string' || !repo.name.trim()) {
      throw new TypeError('Every repository needs a name');
    }
    const top = 76 + index * 174;
    const language = typeof repo.language === 'string' && repo.language ? repo.language : 'Unknown language';
    return `<g transform="translate(0 ${top})">
      <g transform="translate(36 8)" fill="none" stroke="#37d67a" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${repositoryIcon}</g>
      <text x="62" y="22" fill="#37d67a" font-size="18" font-weight="600">${shorten(repo.name, 30)}</text>
      <text x="62" y="46" fill="#8b949e" font-size="13" clip-path="url(#description)">${shorten(repo.description || 'No description provided.', 98)}</text>
      <circle cx="67" cy="66" r="5" fill="${colors[language] || '#8b949e'}"/>
      <text x="80" y="70" fill="#c9d1d9" font-size="12">${shorten(language, 28)}</text>
      <g transform="translate(644 8)"><title>Stars</title><g fill="none" stroke="#37d67a" stroke-width="1.2" stroke-linejoin="round">${starIcon}</g><text x="23" y="13" fill="#c9d1d9" font-size="13">${count(repo.stars)}</text></g>
      <g transform="translate(726 8)"><title>Forks</title><g fill="none" stroke="#37d67a" stroke-width="1.2" stroke-linecap="round">${forkIcon}</g><text x="23" y="13" fill="#c9d1d9" font-size="13">${count(repo.forks)}</text></g>
      <path d="M278 90v43 M519 90v43" stroke="#30363d"/>
      <text x="62" y="112" fill="#f0f6fc" font-size="25" font-weight="600">${count(repo.contributions)}</text>
      <text x="62" y="133" fill="#c9d1d9" font-size="12">Contributions</text>
      <text x="306" y="112" fill="#37d67a" font-size="25" font-weight="600">${count(repo.additions, '+')}</text>
      <text x="306" y="133" fill="#c9d1d9" font-size="12">Lines added</text>
      <text x="547" y="112" fill="#f85149" font-size="25" font-weight="600">${count(repo.deletions, '−')}</text>
      <text x="547" y="133" fill="#c9d1d9" font-size="12">Lines removed</text>
      ${index < repositories.length - 1 ? '<path d="M36 155h748" stroke="#30363d"/>' : ''}
    </g>`;
  }).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="820" height="${height}" viewBox="0 0 820 ${height}" role="img" aria-labelledby="card-title card-description">
  <title id="card-title">Top repositories: ${escape(owner)}</title>
  <desc id="card-description">Public repositories owned by ${escape(owner)}, showing stars, forks, contributions, lines added and lines removed. Contributions count commits authored by ${escape(owner)} on the default branch, excluding merge commits. A dash means unavailable.</desc>
  <defs><clipPath id="description"><rect x="62" y="30" width="722" height="22"/></clipPath></defs>
  <rect width="820" height="${height}" fill="#0d1117"/>
  <g font-family="Segoe UI, Ubuntu, Arial, sans-serif">
    <text x="36" y="43" fill="#37d67a" font-size="20" font-weight="600">Top repositories:</text>
    <text x="784" y="42" fill="#8b949e" font-size="12" text-anchor="end">@${shorten(owner, 39)}</text>
    ${repositories.length ? rows : '<text x="36" y="116" fill="#8b949e" font-size="14">No public repositories found.</text>'}
    <path d="M36 ${height - 49}h748" stroke="#30363d"/>
    <text x="36" y="${height - 25}" fill="#8b949e" font-size="11">Contributions = commits by ${shorten(owner, 39)} · Default branch</text>
  </g>
</svg>\n`;
}
