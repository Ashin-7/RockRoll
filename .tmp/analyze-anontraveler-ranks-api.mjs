import { writeFileSync } from 'node:fs';

const url = 'https://www.anontraveler.com/api/rank/ranks/all/0';
const requested = [];
const originalFetch = globalThis.fetch;

globalThis.fetch = async (input, init) => {
  requested.push({ url: String(input), accept: init?.headers?.accept ?? null });
  return originalFetch(input, init);
};

const response = await fetch(url, { headers: { accept: 'application/json' } });
const payload = await response.json();

function summarize(value, depth = 0) {
  if (depth > 3) return Array.isArray(value) ? `Array(${value.length})` : typeof value;
  if (Array.isArray(value)) {
    return {
      type: 'array',
      length: value.length,
      first: value.length > 0 ? summarize(value[0], depth + 1) : null,
    };
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).slice(0, 20);
    return Object.fromEntries(entries.map(([key, item]) => [key, summarize(item, depth + 1)]));
  }
  return value;
}

function findArrays(value, path = '$', results = []) {
  if (Array.isArray(value)) {
    results.push({ path, length: value.length, firstKeys: value[0] && typeof value[0] === 'object' ? Object.keys(value[0]).slice(0, 30) : [] });
    value.slice(0, 3).forEach((item, index) => findArrays(item, `${path}[${index}]`, results));
    return results;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => findArrays(item, `${path}.${key}`, results));
  }
  return results;
}

const arrays = findArrays(payload).slice(0, 20);
const likelyList = arrays.find((item) => item.length > 0 && item.firstKeys.some((key) => /_id|id|title|name|count|total|item/i.test(key)));
let samples = [];
if (likelyList) {
  const parts = likelyList.path.replace(/^\$\.?/, '').split(/\.(?![^[]*\])/).filter(Boolean);
  let node = payload;
  for (const part of parts) {
    const match = part.match(/([^[]+)(?:\[(\d+)\])?/);
    if (!match) continue;
    node = node?.[match[1]];
    if (match[2] !== undefined) node = node?.[Number(match[2])];
  }
  if (Array.isArray(node)) samples = node.slice(0, 5).map((item) => Object.fromEntries(Object.entries(item).slice(0, 20)));
}

const result = {
  ok: response.ok,
  status: response.status,
  requestCount: requested.length,
  requested,
  summary: summarize(payload),
  arrays,
  likelyListPath: likelyList?.path ?? null,
  samples,
};

writeFileSync('.tmp/anontraveler-ranks-api-analysis.json', JSON.stringify(result, null, 2), 'utf8');
console.log(JSON.stringify(result, null, 2));
