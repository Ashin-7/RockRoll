import {
  AnontravelerRankDirectoryPage,
  AnontravelerRankIndexItem,
  AnontravelerPreview,
  AnontravelerPreviewAlbum,
  AnontravelerPreviewArchiveItem,
  AnontravelerPreviewArtist,
} from './anontraveler.types';
import { ImportCandidateSummary } from './inbox.types';

interface AnontravelerArtistPayload {
  _id?: string;
  name?: string;
}

interface AnontravelerStylePayload {
  name?: unknown;
  title?: unknown;
}

interface AnontravelerAlbumPayload {
  _id?: string;
  title?: string;
  primary_img?: unknown;
  year?: number;
  album_type?: unknown;
  styles?: Array<AnontravelerStylePayload | string>;
  relate_styles?: Array<AnontravelerStylePayload | string>;
  main_artist?: AnontravelerArtistPayload;
  artists?: AnontravelerArtistPayload[];
}

interface AnontravelerItemPayload {
  _id?: string;
  content?: string;
  rank_order?: number;
  main_artist_id?: AnontravelerArtistPayload;
  album_id?: { _id?: string };
  main_album?: AnontravelerAlbumPayload;
}

interface AnontravelerVersionsPayload {
  data?: {
    articles?: Array<{
      _id?: string;
      is_published?: boolean;
    }>;
  };
}

interface AnontravelerVersionPayload {
  data?: {
    article?: {
      _id?: string;
      title?: string;
      content?: string;
    };
    info?: {
      _id?: string;
      title?: string;
      desc?: string;
    };
    items?: AnontravelerItemPayload[];
  };
}

interface AnontravelerRankDirectoryPayload {
  data?: {
    pages?: {
      total?: number;
      pageNow?: number;
      perPage?: number;
    };
    ranks?: Array<{
      _id?: string;
      title?: string;
    }>;
  };
}

export function parseAnontravelerVersionUrl(url: string): { versionId: string; apiUrl: string; sourceKind: string } {
  const parsedUrl = new URL(url);
  const isAnontravelerHost = parsedUrl.hostname === 'www.anontraveler.com' || parsedUrl.hostname === 'anontraveler.com';
  const match = parsedUrl.pathname.match(/^\/rank\/(version|rank)\/([^/]+)$/);

  if (!isAnontravelerHost || !match) {
    throw new Error('Only public Anontraveler rank version URLs are supported.');
  }

  const sourceKind = match[1];
  const versionId = decodeURIComponent(match[2]);

  return {
    versionId,
    apiUrl: `https://www.anontraveler.com/api/rank/${sourceKind}/${versionId}`,
    sourceKind,
  };
}

function parseAnontravelerRankDirectoryUrl(url: string): string {
  const parsedUrl = new URL(url);
  const isAnontravelerHost = parsedUrl.hostname === 'www.anontraveler.com' || parsedUrl.hostname === 'anontraveler.com';
  const normalizedPath = parsedUrl.pathname.replace(/\/$/, '');

  if (!isAnontravelerHost || normalizedPath !== '/rank') {
    throw new Error('Only the Anontraveler rank directory URL is supported for scanning.');
  }

  return 'https://www.anontraveler.com/rank';
}

function decodeHtmlText(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function readNearbyItemCount(html: string, matchEndIndex: number): number | null {
  const nearbyText = decodeHtmlText(html.slice(matchEndIndex, matchEndIndex + 160));
  const countMatch = nearbyText.match(/(\d+)\s*(?:albums?|items?|张|条)/i);

  return countMatch ? Number(countMatch[1]) : null;
}

export function parseAnontravelerRankDirectory(html: string, discoveredAt = new Date().toISOString()): AnontravelerRankIndexItem[] {
  const linkPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const itemsByVersionId = new Map<string, AnontravelerRankIndexItem>();
  let linkMatch: RegExpExecArray | null;

  while ((linkMatch = linkPattern.exec(html)) !== null) {
    const href = linkMatch[1];
    const title = decodeHtmlText(linkMatch[2]);
    const rankMatch = href.match(/(?:https?:\/\/www\.anontraveler\.com)?\/rank\/(version|rank)\/([^/?#]+)/);
    if (!rankMatch || !title) {
      continue;
    }

    const sourceKind = rankMatch[1];
    const versionId = decodeURIComponent(rankMatch[2]);
    if (itemsByVersionId.has(versionId)) {
      continue;
    }

    itemsByVersionId.set(versionId, {
      title,
      versionId,
      sourceUrl: `https://www.anontraveler.com/rank/${sourceKind}/${versionId}`,
      itemCount: readNearbyItemCount(html, linkPattern.lastIndex),
      status: 'pending',
      discoveredAt,
      lastImportedAt: null,
    });
  }

  return Array.from(itemsByVersionId.values());
}

export function mergeAnontravelerRankDirectoryItems(
  existingItems: AnontravelerRankIndexItem[],
  discoveredItems: AnontravelerRankIndexItem[],
): AnontravelerRankIndexItem[] {
  const itemsByVersionId = new Map(existingItems.map((item) => [item.versionId, item] as const));

  discoveredItems.forEach((item) => {
    const existingItem = itemsByVersionId.get(item.versionId);
    itemsByVersionId.set(item.versionId, existingItem ? {
      ...existingItem,
      title: item.title,
      sourceUrl: item.sourceUrl,
      itemCount: item.itemCount,
    } : item);
  });

  return Array.from(itemsByVersionId.values());
}

function addArtist(artistsById: Map<string, AnontravelerPreviewArtist>, artist?: AnontravelerArtistPayload) {
  if (!artist?._id || !artist.name || artistsById.has(artist._id)) {
    return;
  }

  artistsById.set(artist._id, {
    externalId: artist._id,
    name: artist.name,
  });
}

function readStyleText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object') {
    const record = value as { name?: unknown; title?: unknown };
    return readStyleText(record.name ?? record.title);
  }

  return '';
}

function readStyleName(style: AnontravelerStylePayload | string): string {
  if (typeof style === 'string') {
    return style;
  }

  return readStyleText(style.name ?? style.title);
}

function readAlbumStyles(album?: AnontravelerAlbumPayload): string[] {
  const styleNames = [...(album?.styles ?? []), ...(album?.relate_styles ?? [])]
    .map(readStyleName)
    .map((styleName) => styleName.trim())
    .filter(Boolean);

  return Array.from(new Set(styleNames));
}

function buildArchiveItemExternalId(item: AnontravelerItemPayload, versionId: string, albumExternalId: string, position: number | null) {
  const itemKey = item._id ?? (typeof position === 'number' ? String(position) : 'unknown');
  return `${versionId}:item:${itemKey}:${albumExternalId}`;
}

function mapPreview(
  payload: AnontravelerVersionPayload,
  sourceUrl: string,
  versionId: string,
  noteByAlbumExternalId = new Map<string, string>(),
): AnontravelerPreview {
  const article = payload.data?.article ?? payload.data?.info;
  const description = payload.data?.article?.content ?? payload.data?.info?.desc ?? '';
  const rankOrderBase = payload.data?.info ? 1 : 0;
  const items = payload.data?.items ?? [];
  const artistsById = new Map<string, AnontravelerPreviewArtist>();
  const albums: AnontravelerPreviewAlbum[] = [];
  const archiveItems: AnontravelerPreviewArchiveItem[] = [];

  items.forEach((item) => {
    const album = item.main_album;
    const albumExternalId = album?._id ?? item.album_id?._id;
    const title = album?.title;
    const mainArtist = item.main_artist_id ?? album?.main_artist ?? album?.artists?.[0];

    addArtist(artistsById, mainArtist);
    album?.artists?.forEach((artist) => addArtist(artistsById, artist));

    if (!albumExternalId || !title) {
      return;
    }

    const artistName = mainArtist?.name ?? album?.main_artist?.name ?? album?.artists?.[0]?.name ?? 'Unknown artist';
    const note = item.content ?? noteByAlbumExternalId.get(albumExternalId) ?? '';
    const position = typeof item.rank_order === 'number' ? item.rank_order - rankOrderBase + 1 : null;

    albums.push({
      externalId: albumExternalId,
      title,
      artistName,
      releaseYear: typeof album?.year === 'number' ? album.year : null,
      coverUrl: readStyleText(album?.primary_img),
      styles: readAlbumStyles(album),
      albumType: readStyleText(album?.album_type),
      note,
    });
    archiveItems.push({
      externalId: buildArchiveItemExternalId(item, versionId, albumExternalId, position),
      albumExternalId,
      displayTitle: title,
      position,
      note,
    });
  });

  return {
    versionId,
    sourceUrl,
    collection: {
      externalId: article?._id ?? versionId,
      title: article?.title ?? 'Anontraveler rank version',
      description,
      source: 'anontraveler',
      collectionType: 'album_rank',
    },
    artists: Array.from(artistsById.values()),
    albums,
    archiveItems,
    skippedSongs: 0,
  };
}

function formatAlbumSubtitle(album: AnontravelerPreviewAlbum): string {
  return [album.artistName, album.releaseYear ? String(album.releaseYear) : null].filter(Boolean).join(' - ');
}

function compareNullableRank(leftRank: number | null | undefined, rightRank: number | null | undefined): number {
  if (typeof leftRank === 'number' && typeof rightRank === 'number') {
    return leftRank - rightRank;
  }

  if (typeof leftRank === 'number') {
    return -1;
  }

  if (typeof rightRank === 'number') {
    return 1;
  }

  return 0;
}

function compareAlbumCandidates(left: ImportCandidateSummary, right: ImportCandidateSummary): number {
  const rankOrder = compareNullableRank(left.metadata?.sourceRank, right.metadata?.sourceRank);
  if (rankOrder !== 0) {
    return rankOrder;
  }

  const titleOrder = left.displayTitle.localeCompare(right.displayTitle);
  if (titleOrder !== 0) {
    return titleOrder;
  }

  return left.id.localeCompare(right.id);
}

export function mapAnontravelerPreviewCandidates(preview: AnontravelerPreview): ImportCandidateSummary[] {
  const rankByAlbumExternalId = new Map(
    preview.archiveItems.map((item) => [item.albumExternalId, item.position] as const),
  );
  const albumCandidates = preview.albums
    .map((album) => ({
      id: `anontraveler:album:${album.externalId}`,
      entityType: 'album' as const,
      displayTitle: album.title,
      displaySubtitle: formatAlbumSubtitle(album),
      sourceName: 'anontraveler' as const,
      metadata: {
        artistName: album.artistName,
        releaseYear: album.releaseYear,
        coverUrl: album.coverUrl,
        styles: album.styles,
        albumType: album.albumType,
        note: album.note,
        sourceRank: rankByAlbumExternalId.get(album.externalId) ?? null,
      },
    }))
    .sort(compareAlbumCandidates);

  return [
    ...preview.artists.map((artist) => ({
      id: `anontraveler:artist:${artist.externalId}`,
      entityType: 'artist' as const,
      displayTitle: artist.name,
      displaySubtitle: 'Anontraveler artist candidate',
      sourceName: 'anontraveler' as const,
    })),
    ...albumCandidates,
  ];
}

async function fetchAnontravelerJson<T>(apiUrl: string): Promise<T> {
  const response = await fetch(apiUrl, {
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Unable to load Anontraveler preview.');
  }

  return (await response.json()) as T;
}

async function fetchAnontravelerText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { accept: 'text/html' },
  });

  if (!response.ok) {
    throw new Error('Unable to scan Anontraveler rank directory.');
  }

  return response.text();
}

function mapRankDirectoryPayload(
  payload: AnontravelerRankDirectoryPayload,
  discoveredAt: string,
  page: number,
): AnontravelerRankDirectoryPage {
  const itemsByVersionId = new Map<string, AnontravelerRankIndexItem>();

  (payload.data?.ranks ?? []).forEach((rank) => {
    if (!rank._id || !rank.title || itemsByVersionId.has(rank._id)) {
      return;
    }

    itemsByVersionId.set(rank._id, {
      title: rank.title,
      versionId: rank._id,
      sourceUrl: `https://www.anontraveler.com/rank/rank/${rank._id}`,
      itemCount: null,
      status: 'pending',
      discoveredAt,
      lastImportedAt: null,
    });
  });

  const total = payload.data?.pages?.total ?? itemsByVersionId.size;
  const perPage = payload.data?.pages?.perPage ?? itemsByVersionId.size;
  const normalizedPerPage = perPage > 0 ? perPage : itemsByVersionId.size;

  return {
    items: Array.from(itemsByVersionId.values()),
    total,
    page,
    perPage: normalizedPerPage,
    hasMore: normalizedPerPage > 0 ? (page + 1) * normalizedPerPage < total : false,
  };
}

export async function scanAnontravelerRankDirectoryPage(
  page = 0,
  discoveredAt = new Date().toISOString(),
): Promise<AnontravelerRankDirectoryPage> {
  const normalizedPage = Math.max(0, Math.floor(page));
  const payload = await fetchAnontravelerJson<AnontravelerRankDirectoryPayload>(
    `https://www.anontraveler.com/api/rank/ranks/all/${normalizedPage}`,
  );

  return mapRankDirectoryPayload(payload, discoveredAt, normalizedPage);
}

export async function scanAnontravelerRankDirectory(
  url: string,
  discoveredAt = new Date().toISOString(),
): Promise<AnontravelerRankIndexItem[]> {
  parseAnontravelerRankDirectoryUrl(url);
  const directoryPage = await scanAnontravelerRankDirectoryPage(0, discoveredAt);

  return directoryPage.items;
}

async function loadRankVersionNotes(rankId: string): Promise<Map<string, string>> {
  try {
    const versions = await fetchAnontravelerJson<AnontravelerVersionsPayload>(
      `https://www.anontraveler.com/api/rank/versions/${rankId}`,
    );
    const versionId = versions.data?.articles?.find((article) => article.is_published !== false)?._id;
    if (!versionId) {
      return new Map();
    }

    const detail = await fetchAnontravelerJson<AnontravelerVersionPayload>(
      `https://www.anontraveler.com/api/rank/version/${versionId}`,
    );
    return new Map(
      (detail.data?.items ?? [])
        .map((item) => [item.main_album?._id ?? item.album_id?._id ?? '', item.content?.trim() ?? ''] as const)
        .filter(([albumExternalId, note]) => albumExternalId && note),
    );
  } catch {
    return new Map();
  }
}

export async function previewAnontravelerImport(url: string): Promise<AnontravelerPreview> {
  const { apiUrl, versionId, sourceKind } = parseAnontravelerVersionUrl(url);
  const payload = await fetchAnontravelerJson<AnontravelerVersionPayload>(apiUrl);
  const noteByAlbumExternalId = sourceKind === 'rank' ? await loadRankVersionNotes(versionId) : new Map<string, string>();

  return mapPreview(payload, url, versionId, noteByAlbumExternalId);
}
