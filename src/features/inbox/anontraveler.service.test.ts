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
          primary_img: 'https://img.example.test/please-please-me.jpg',
          year: 1963,
          album_type: { index: 1, name: '专辑' },
          styles: [{ name: { index: 1, name: '节拍音乐' } }, { title: '摇滚' }],
          relate_styles: ['早期流行/摇滚'],
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
          coverUrl: 'https://img.example.test/please-please-me.jpg',
          styles: ['节拍音乐', '摇滚', '早期流行/摇滚'],
          albumType: '专辑',
          note: 'Beat music marker.',
        },
        {
          externalId: 'album-2',
          title: 'Highway 61 Revisited',
          artistName: 'Bob Dylan',
          releaseYear: 1965,
          coverUrl: '',
          styles: [],
          albumType: '',
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

  it('maps an Anontraveler preview into inbox candidate summaries', async () => {
    const { mapAnontravelerPreviewCandidates } = await import('./anontraveler.service');

    expect(
      mapAnontravelerPreviewCandidates({
        versionId: 'version-1',
        sourceUrl: 'https://www.anontraveler.com/rank/version/version-1',
        collection: {
          externalId: 'version-1',
          title: 'Classic rock guide',
          description: 'Albums to explore.',
          source: 'anontraveler',
          collectionType: 'album_rank',
        },
        artists: [{ externalId: 'artist-1', name: 'The Beatles' }],
        albums: [
          {
            externalId: 'album-1',
          title: 'Please Please Me',
          artistName: 'The Beatles',
          releaseYear: 1963,
          coverUrl: 'https://img.example.test/please-please-me.jpg',
          styles: ['节拍音乐', '摇滚'],
          albumType: '专辑',
          note: 'Beat music marker.',
        },
        ],
        archiveItems: [],
        skippedSongs: 0,
      }),
    ).toEqual([
      {
        id: 'anontraveler:artist:artist-1',
        entityType: 'artist',
        displayTitle: 'The Beatles',
        displaySubtitle: 'Anontraveler artist candidate',
        sourceName: 'anontraveler',
      },
      {
        id: 'anontraveler:album:album-1',
        entityType: 'album',
        displayTitle: 'Please Please Me',
        displaySubtitle: 'The Beatles - 1963',
        sourceName: 'anontraveler',
        metadata: {
          artistName: 'The Beatles',
          releaseYear: 1963,
          coverUrl: 'https://img.example.test/please-please-me.jpg',
          styles: ['节拍音乐', '摇滚'],
          albumType: '专辑',
          note: 'Beat music marker.',
          sourceRank: null,
        },
      },
    ]);
  });
  it('maps album source rank from Anontraveler archive item position and sorts albums by that rank', async () => {
    const { mapAnontravelerPreviewCandidates } = await import('./anontraveler.service');

    const mappedCandidates = mapAnontravelerPreviewCandidates({
      versionId: 'version-1',
      sourceUrl: 'https://www.anontraveler.com/rank/version/version-1',
      collection: {
        externalId: 'version-1',
        title: 'Classic rock guide',
        description: '',
        source: 'anontraveler',
        collectionType: 'album_rank',
      },
      artists: [],
      albums: [
        {
          externalId: 'album-2',
          title: 'Rank Two',
          artistName: 'Artist B',
          releaseYear: null,
          coverUrl: '',
          styles: [],
          albumType: '',
          note: '',
        },
        {
          externalId: 'album-1',
          title: 'Rank One',
          artistName: 'Artist A',
          releaseYear: null,
          coverUrl: '',
          styles: [],
          albumType: '',
          note: '',
        },
      ],
      archiveItems: [
        { externalId: 'item-2', albumExternalId: 'album-2', displayTitle: 'Rank Two', position: 2, note: '' },
        { externalId: 'item-1', albumExternalId: 'album-1', displayTitle: 'Rank One', position: 1, note: '' },
      ],
      skippedSongs: 0,
    });

    expect(mappedCandidates.map((candidate) => candidate.displayTitle)).toEqual(['Rank One', 'Rank Two']);
    expect(mappedCandidates.map((candidate) => candidate.metadata?.sourceRank)).toEqual([1, 2]);
  });
});
