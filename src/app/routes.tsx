export type AppRoute =
  | 'auth'
  | 'backstage'
  | 'songs'
  | 'songDetail'
  | 'albums'
  | 'albumDetail'
  | 'artistDetail'
  | 'practice'
  | 'archive'
  | 'archiveDetail'
  | 'inbox'
  | 'library'
  | 'toolbox';

const routes: Record<string, AppRoute> = {
  '#auth': 'auth',
  '#backstage': 'backstage',
  '#songs': 'songs',
  '#albums': 'albums',
  '#practice': 'practice',
  '#archive': 'archive',
  '#inbox': 'inbox',
  '#library': 'library',
  '#toolbox': 'toolbox',
};

export function getRouteForHash(hash: string): AppRoute {
  if (hash.startsWith('#song/')) {
    return 'songDetail';
  }

  if (hash.startsWith('#album/')) {
    return 'albumDetail';
  }

  if (hash.startsWith('#archive/')) {
    return 'archiveDetail';
  }

  if (hash.startsWith('#artist/')) {
    return 'artistDetail';
  }

  return routes[hash] ?? 'backstage';
}

export function getSongIdForHash(hash: string): string | null {
  return hash.startsWith('#song/') ? decodeURIComponent(hash.slice('#song/'.length)) : null;
}

export function getAlbumIdForHash(hash: string): string | null {
  return hash.startsWith('#album/') ? decodeURIComponent(hash.slice('#album/'.length)) : null;
}

export function getArtistIdForHash(hash: string): string | null {
  return hash.startsWith('#artist/') ? decodeURIComponent(hash.slice('#artist/'.length)) : null;
}

export function getArchiveIdForHash(hash: string): string | null {
  return hash.startsWith('#archive/') ? decodeURIComponent(hash.slice('#archive/'.length)) : null;
}
