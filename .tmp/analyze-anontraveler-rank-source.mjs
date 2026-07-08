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

function readAttributes(tag) {
  const attributes = {};
  const pattern = /([:@A-Za-z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match;

  while ((match = pattern.exec(tag)) !== null) {
    attributes[match[1]] = match[2] ?? match[3] ?? match[4] ?? '';
  }

  return attributes;
}

function countMatches(html, pattern) {
  return Array.from(html.matchAll(pattern)).length;
}

function sampleMatches(html, pattern, limit = 10) {
  return Array.from(html.matchAll(pattern)).slice(0, limit).map((match) => match[0].slice(0, 160));
}

const response = await fetch(url, { headers: { accept: 'text/html' } });
const html = await response.text();

const scripts = [];
const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let scriptMatch;

while ((scriptMatch = scriptPattern.exec(html)) !== null) {
  const attributes = readAttributes(scriptMatch[1]);
  const body = scriptMatch[2] ?? '';
  scripts.push({
    src: attributes.src ?? '',
    type: attributes.type ?? '',
    id: attributes.id ?? '',
    async: Object.prototype.hasOwnProperty.call(attributes, 'async'),
    defer: Object.prototype.hasOwnProperty.call(attributes, 'defer'),
    bodyLength: body.length,
    bodyPreview: body.trim().slice(0, 180),
  });
}

const keywordPatterns = {
  rank: /rank/gi,
  version: /version/gi,
  bangdan: /榜单/g,
  apiPath: /\/api\//gi,
  static: /static/gi,
  assets: /assets/gi,
};

const keywordSummary = Object.fromEntries(
  Object.entries(keywordPatterns).map(([key, pattern]) => [
    key,
    {
      count: countMatches(html, pattern),
      samples: sampleMatches(html, pattern, 5),
    },
  ]),
);

const markers = {
  hasNextData: /<script[^>]+id=["']__NEXT_DATA__["']/i.test(html) || html.includes('__NEXT_DATA__'),
  hasNuxt: html.includes('__NUXT__') || html.includes('__nuxt'),
  hasVite: html.includes('/@vite') || html.includes('vite') || html.includes('Vite'),
  hasReactRoot: html.includes('id="root"') || html.includes("id='root'") || html.includes('data-reactroot'),
  hasVueRoot: html.includes('id="app"') || html.includes("id='app'") || html.includes('data-server-rendered'),
  hasHydrationTerms: /hydrate|hydration|__INITIAL_STATE__|__PRELOADED_STATE__|window\.__/i.test(html),
};

const externalScriptSrcs = scripts.filter((script) => script.src).map((script) => script.src);
const inlineScripts = scripts.filter((script) => !script.src);
const potentialApiStrings = Array.from(new Set(Array.from(html.matchAll(/(?:https?:\/\/[^"'\s<>]+|\/api\/[^"'\s<>]+)/gi)).map((match) => match[0]))).slice(0, 20);

const result = {
  ok: response.ok,
  status: response.status,
  requestCount: requested.length,
  requested,
  htmlLength: html.length,
  scriptCount: scripts.length,
  externalScriptCount: externalScriptSrcs.length,
  inlineScriptCount: inlineScripts.length,
  scripts,
  externalScriptSrcs,
  markers,
  keywordSummary,
  potentialApiStrings,
  likelySource: {
    inlineJson: markers.hasNextData || markers.hasNuxt || markers.hasHydrationTerms || inlineScripts.some((script) => /rank|version|榜单|\/api\//i.test(script.bodyPreview)),
    externalJsBundle: externalScriptSrcs.length > 0,
    frontendApi: potentialApiStrings.length > 0 || keywordSummary.apiPath.count > 0,
    renderedDom: externalScriptSrcs.length > 0 && !markers.hasNextData && !markers.hasNuxt && keywordSummary.apiPath.count === 0,
  },
};

writeFileSync('.tmp/anontraveler-rank-source-analysis.json', JSON.stringify(result, null, 2), 'utf8');
console.log(JSON.stringify(result, null, 2));
