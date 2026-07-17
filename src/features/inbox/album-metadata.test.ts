import { describe, expect, it } from 'vitest';
import { normalizeAlbumFields } from './album-metadata';

describe('normalizeAlbumFields', () => {
  it('trims cover urls and removes empty duplicate style labels in first-seen order', () => {
    expect(
      normalizeAlbumFields({
        coverUrl: '  https://img.example.test/album.jpg  ',
        styles: [' Rock ', '', 'Rock', 'rock', '  Psychedelic  '],
      }),
    ).toEqual({
      coverUrl: 'https://img.example.test/album.jpg',
      styles: ['Rock', 'rock', 'Psychedelic'],
    });
  });

  it('uses null and an empty array when source metadata is missing or blank', () => {
    expect(normalizeAlbumFields()).toEqual({ coverUrl: null, styles: [] });
    expect(normalizeAlbumFields({ coverUrl: '   ', styles: [' ', ''] })).toEqual({
      coverUrl: null,
      styles: [],
    });
  });
});
