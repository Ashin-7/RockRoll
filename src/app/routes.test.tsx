import { describe, expect, it } from 'vitest';
import { getArtistIdForHash, getRouteForHash, getSongIdForHash } from './routes';

describe('getRouteForHash', () => {
  it('uses backstage as the default route', () => {
    expect(getRouteForHash('')).toBe('backstage');
  });

  it('resolves known routes', () => {
    expect(getRouteForHash('#songs')).toBe('songs');
    expect(getRouteForHash('#song/song-1')).toBe('songDetail');
    expect(getRouteForHash('#artists')).toBe('artists');
    expect(getRouteForHash('#artist/artist-1')).toBe('artistDetail');
    expect(getRouteForHash('#practice')).toBe('practice');
    expect(getRouteForHash('#archive')).toBe('archive');
    expect(getRouteForHash('#inbox')).toBe('inbox');
    expect(getRouteForHash('#library')).toBe('library');
    expect(getRouteForHash('#auth')).toBe('auth');
  });

  it('reads song ids from song detail hashes', () => {
    expect(getSongIdForHash('#song/song-1')).toBe('song-1');
    expect(getSongIdForHash('#song/song%20with%20space')).toBe('song with space');
    expect(getSongIdForHash('#songs')).toBeNull();
  });

  it('reads artist ids from artist detail hashes', () => {
    expect(getArtistIdForHash('#artist/artist-1')).toBe('artist-1');
    expect(getArtistIdForHash('#artist/artist%20with%20space')).toBe('artist with space');
    expect(getArtistIdForHash('#artists')).toBeNull();
  });
});
