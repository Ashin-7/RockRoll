import { describe, expect, it } from 'vitest';
import { getRouteForHash } from './routes';

describe('getRouteForHash', () => {
  it('uses backstage as the default route', () => {
    expect(getRouteForHash('')).toBe('backstage');
  });

  it('resolves known routes', () => {
    expect(getRouteForHash('#songs')).toBe('songs');
    expect(getRouteForHash('#practice')).toBe('practice');
    expect(getRouteForHash('#archive')).toBe('archive');
    expect(getRouteForHash('#inbox')).toBe('inbox');
    expect(getRouteForHash('#library')).toBe('library');
    expect(getRouteForHash('#auth')).toBe('auth');
  });
});
