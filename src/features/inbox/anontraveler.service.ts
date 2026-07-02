import {
  AnontravelerPreview,
  AnontravelerPreviewAlbum,
  AnontravelerPreviewArchiveItem,
  AnontravelerPreviewArtist,
} from './anontraveler.types';

interface AnontravelerArtistPayload {
  _id?: string;
  name?: string;
}

interface AnontravelerAlbumPayload {
  _id?: string;
  title?: string;
  year?: number;
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
