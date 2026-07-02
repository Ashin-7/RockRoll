export type AppRoute =
  | 'auth'
  | 'backstage'
  | 'songs'
  | 'songDetail'
  | 'artists'
  | 'practice'
  | 'archive'
  | 'inbox'
  | 'library';

const routes: Record<string, AppRoute> = {
  '#auth': 'auth',
  '#backstage': 'backstage',
  '#songs': 'songs',
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

  return routes[hash] ?? 'backstage';
}

export function getSongIdForHash(hash: string): string | null {
  return hash.startsWith('#song/') ? decodeURIComponent(hash.slice('#song/'.length)) : null;
}
