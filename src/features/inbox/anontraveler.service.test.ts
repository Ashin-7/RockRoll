import { beforeEach, describe, expect, it, vi } from 'vitest';

const anontravelerPayload = {
  data: {
    article: {
      _id: 'version-1',
      title: 'Classic rock guide',
      content: 'Albums to explore.',
    },
    items: [
      {
        _id: 'item-1',
        content: 'Beat music marker.',
        rank_order: 0,
        main_artist_id: {
          _id: 'artist-1',
          name: 'The Beatles',
        },
        album_id: {
          _id: 'album-1',
        },
        main_album: {
          _id: 'album-1',
          title: 'Please Please Me',
          year: 1963,
          artists: [
            {
              _id: 'artist-1',
              name: 'The Beatles',
            },
          ],
        },
      },
      {
        _id: 'item-2',
        content: 'Folk rock marker.',
        rank_order: 1,
        main_artist_id: {
          _id: 'artist-2',
          name: 'Bob Dylan',
        },
        album_id: {
          _id: 'album-2',
        },
        main_album: {
          _id: 'album-2',
          title: 'Highway 61 Revisited',
          year: 1965,
          artists: [
            {
              _id: 'artist-2',
              name: 'Bob Dylan',
            },
          ],
        },
      },
    ],
  },
};

describe('anontraveler.service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('parses an Anontraveler rank version URL', async () => {
    const { parseAnontravelerVersionUrl } = await import('./anontraveler.service');

    expect(
      parseAnontravelerVersionUrl('https://www.anontraveler.com/rank/version/65f3e6194e5b897fbb0a7bfa'),
    ).toEqual({
      versionId: '65f3e6194e5b897fbb0a7bfa',
      apiUrl: 'https://www.anontraveler.com/api/rank/version/65f3e6194e5b897fbb0a7bfa',
    });
  });

  it('rejects non-Anontraveler URLs', async () => {
    const { parseAnontravelerVersionUrl } = await import('./anontraveler.service');

    expect(() => parseAnontravelerVersionUrl('https://example.test/rank/version/version-1')).toThrow(
      'Only public Anontraveler rank version URLs are supported.',
    );
  });

  it('fetches public JSON and maps it into a preview', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => anontravelerPayload,
    });
    vi.stubGlobal('fetch', fetchMock);
    const { previewAnontravelerImport } = await import('./anontraveler.service');

    await expect(
      previewAnontravelerImport('https://www.anontraveler.com/rank/version/version-1'),
    ).resolves.toEqual({
      versionId: 'version-1',
      sourceUrl: 'https://www.anontraveler.com/rank/version/version-1',
      collection: {
        externalId: 'version-1',
        title: 'Classic rock guide',
        description: 'Albums to explore.',
        source: 'anontraveler',
        collectionType: 'album_rank',
      },
      artists: [
        {
          externalId: 'artist-1',
          name: 'The Beatles',
        },
        {
          externalId: 'artist-2',
          name: 'Bob Dylan',
        },
      ],
      albums: [
        {
          externalId: 'album-1',
          title: 'Please Please Me',
          artistName: 'The Beatles',
          releaseYear: 1963,
          note: 'Beat music marker.',
        },
        {
          externalId: 'album-2',
          title: 'Highway 61 Revisited',
          artistName: 'Bob Dylan',
          releaseYear: 1965,
          note: 'Folk rock marker.',
        },
      ],
      archiveItems: [
        {
          externalId: 'item-1',
          albumExternalId: 'album-1',
          displayTitle: 'Please Please Me',
          position: 1,
          note: 'Beat music marker.',
        },
        {
          externalId: 'item-2',
          albumExternalId: 'album-2',
          displayTitle: 'Highway 61 Revisited',
          position: 2,
          note: 'Folk rock marker.',
        },
      ],
      skippedSongs: 0,
    });
    expect(fetchMock).toHaveBeenCalledWith('https://www.anontraveler.com/api/rank/version/version-1', {
      headers: { accept: 'application/json' },
    });
  });
});
