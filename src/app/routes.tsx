export type AppRoute =
  | 'auth'
  | 'backstage'
  | 'songs'
  | 'songDetail'
  | 'albums'
  | 'albumDetail'
  | 'artists'
  | 'artistDetail'
  | 'practice'
  | 'archive'
  | 'inbox'
  | 'library';

const routes: Record<string, AppRoute> = {
  '#auth': 'auth',
  '#backstage': 'backstage',
  '#songs': 'songs',
  '#albums': 'albums',
  '#artists': 'artists',
  '#practice': 'practice',
  '#archive': 'archive',
  '#inbox': 'inbox',
  '#library': 'library',
};

export function getRouteForHash(hash: string): AppRoute {
  if (hash.startsWith('#song/')) {
    return 'songDetail';
  }

  if (hash.startsWith('#album/')) {
    return 'albumDetail';
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
