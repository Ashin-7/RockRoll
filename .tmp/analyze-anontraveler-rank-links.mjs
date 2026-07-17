import { writeFileSync } from 'node:fs';

const url = 'https://www.anontraveler.com/rank';
const requested = [];
const originalFetch = globalThis.fetch;

globalThis.fetch = async (input, init) => {
  requested.push({
    url: String(input),
    accept: init?.headers?.accept ?? null,
  });
  return originalFetch(input, init);
};

function decodeHtml(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readAttributes(tag) {
  const attributes = {};
  const pattern = /([:@A-Za-z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match;

  while ((match = pattern.exec(tag)) !== null) {
    attributes[match[1]] = match[2] ?? match[3] ?? match[4] ?? '';
  }

  return attributes;
}

function classifyHref(href) {
  if (!href) {
    return 'empty';
  }

  try {
    const parsed = new URL(href, url);
    const path = parsed.pathname;

    if (path === '/rank' || path === '/rank/') {
      return '/rank';
    }

    if (/^\/rank\/version\//.test(path)) {
      return '/rank/version/...';
    }

    if (/^\/rank\/rank\//.test(path)) {
      return '/rank/rank/...';
    }

    if (/^\/rank\//.test(path)) {
      return '/rank/...';
    }

    return 'other path';
  } catch {
    return 'invalid';
  }
}

const response = await fetch(url, { headers: { accept: 'text/html' } });
const html = await response.text();
const anchors = [];
const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
let anchorMatch;

while ((anchorMatch = anchorPattern.exec(html)) !== null) {
  const attributes = readAttributes(anchorMatch[1]);
  anchors.push({
    href: attributes.href ?? '',
    text: decodeHtml(anchorMatch[2]),
    title: attributes.title ?? '',
    ariaLabel: attributes['aria-label'] ?? '',
    className: attributes.class ?? '',
  });
}

const hrefDistribution = {};
for (const anchor of anchors) {
  const category = classifyHref(anchor.href);
  hrefDistribution[category] = (hrefDistribution[category] ?? 0) + 1;
}

const rankAnchors = anchors
  .map((anchor) => ({ ...anchor, category: classifyHref(anchor.href) }))
  .filter((anchor) => anchor.category.startsWith('/rank'));

const candidates = anchors
  .map((anchor) => {
    const absolute = anchor.href ? new URL(anchor.href, url).toString() : '';
    const path = anchor.href ? new URL(anchor.href, url).pathname : '';

    return {
      ...anchor,
      absolute,
      path,
      category: classifyHref(anchor.href),
    };
  })
  .filter((anchor) => anchor.category.startsWith('/rank/') && (anchor.text || anchor.title || anchor.ariaLabel));

const result = {
  ok: response.ok,
  status: response.status,
  requestCount: requested.length,
  requested,
  htmlLength: html.length,
  anchorCount: anchors.length,
  hrefDistribution,
  rankAnchorCount: rankAnchors.length,
  rankAnchors: rankAnchors.slice(0, 50).map(({ href, text, title, ariaLabel, category }) => ({
    href,
    text,
    title,
    ariaLabel,
    category,
  })),
  candidateCount: candidates.length,
  candidateSamples: candidates.slice(0, 10).map(({ href, absolute, path, text, title, ariaLabel, category }) => ({
    href,
    absolute,
    path,
    text,
    title,
    ariaLabel,
    category,
  })),
};

writeFileSync('.tmp/anontraveler-rank-link-analysis.json', JSON.stringify(result, null, 2), 'utf8');
console.log(JSON.stringify(result, null, 2));
