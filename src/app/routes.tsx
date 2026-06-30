export type AppRoute = 'auth' | 'backstage' | 'songs' | 'archive' | 'inbox' | 'library';

const routes: Record<string, AppRoute> = {
  '#auth': 'auth',
  '#backstage': 'backstage',
  '#songs': 'songs',
  '#archive': 'archive',
  '#inbox': 'inbox',
  '#library': 'library',
};

export function getRouteForHash(hash: string): AppRoute {
  return routes[hash] ?? 'backstage';
}
