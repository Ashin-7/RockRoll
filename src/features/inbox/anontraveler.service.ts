import {
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

interface AnontravelerVersionPayload {
  data?: {
    article?: {
      _id?: string;
      title?: string;
      content?: string;
    };
    items?: AnontravelerItemPayload[];
  };
}

export function parseAnontravelerVersionUrl(url: string): { versionId: string; apiUrl: string } {
  const parsedUrl = new URL(url);
  const isAnontravelerHost = parsedUrl.hostname === 'www.anontraveler.com' || parsedUrl.hostname === 'anontraveler.com';
  const match = parsedUrl.pathname.match(/^\/rank\/version\/([^/]+)$/);

  if (!isAnontravelerHost || !match) {
    throw new Error('Only public Anontraveler rank version URLs are supported.');
  }

  return {
    versionId: decodeURIComponent(match[1]),
    apiUrl: `https://www.anontraveler.com/api/rank/version/${decodeURIComponent(match[1])}`,
  };
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

function mapPreview(payload: AnontravelerVersionPayload, sourceUrl: string, versionId: string): AnontravelerPreview {
  const article = payload.data?.article;
  const items = payload.data?.items ?? [];
  const artistsById = new Map<string, AnontravelerPreviewArtist>();
  const albums: AnontravelerPreviewAlbum[] = [];
  const archiveItems: AnontravelerPreviewArchiveItem[] = [];

  items.forEach((item) => {
    const album = item.main_album;
    const albumExternalId = album?._id ?? item.album_id?._id;
    const title = album?.title;
    const mainArtist = item.main_artist_id ?? album?.artists?.[0];

    addArtist(artistsById, mainArtist);
    album?.artists?.forEach((artist) => addArtist(artistsById, artist));

    if (!albumExternalId || !title) {
      return;
    }

    const artistName = mainArtist?.name ?? album?.artists?.[0]?.name ?? 'Unknown artist';
    const note = item.content ?? '';
    const position = typeof item.rank_order === 'number' ? item.rank_order + 1 : null;

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
      externalId: item._id ?? albumExternalId,
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
      description: article?.content ?? '',
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

export async function previewAnontravelerImport(url: string): Promise<AnontravelerPreview> {
  const { apiUrl, versionId } = parseAnontravelerVersionUrl(url);
  const response = await fetch(apiUrl, {
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Unable to load Anontraveler preview.');
  }

  return mapPreview((await response.json()) as AnontravelerVersionPayload, url, versionId);
}
