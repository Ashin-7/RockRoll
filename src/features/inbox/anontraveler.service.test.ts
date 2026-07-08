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
      sourceKind: 'version',
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
          externalId: 'version-1:item:item-1:album-1',
          albumExternalId: 'album-1',
          displayTitle: 'Please Please Me',
          position: 1,
          note: 'Beat music marker.',
        },
        {
          externalId: 'version-1:item:item-2:album-2',
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

  it('keeps archive item ids unique per rank when the same album appears in different ranks', async () => {
    const firstRankPayload = {
      data: {
        article: { _id: 'version-a', title: 'First rank', content: '' },
        items: [
          {
            rank_order: 0,
            album_id: { _id: 'shared-album-1' },
            main_artist_id: { _id: 'artist-1', name: 'Shared Artist' },
            main_album: { _id: 'shared-album-1', title: 'Shared Album', artists: [{ _id: 'artist-1', name: 'Shared Artist' }] },
          },
        ],
      },
    };
    const secondRankPayload = {
      data: {
        article: { _id: 'version-b', title: 'Second rank', content: '' },
        items: [
          {
            rank_order: 0,
            album_id: { _id: 'shared-album-1' },
            main_artist_id: { _id: 'artist-1', name: 'Shared Artist' },
            main_album: { _id: 'shared-album-1', title: 'Shared Album', artists: [{ _id: 'artist-1', name: 'Shared Artist' }] },
          },
        ],
      },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => firstRankPayload })
      .mockResolvedValueOnce({ ok: true, json: async () => secondRankPayload });
    vi.stubGlobal('fetch', fetchMock);
    const { previewAnontravelerImport } = await import('./anontraveler.service');

    const firstPreview = await previewAnontravelerImport('https://www.anontraveler.com/rank/version/version-a');
    const secondPreview = await previewAnontravelerImport('https://www.anontraveler.com/rank/version/version-b');

    expect(firstPreview.albums[0].externalId).toBe('shared-album-1');
    expect(secondPreview.albums[0].externalId).toBe('shared-album-1');
    expect(firstPreview.archiveItems[0].externalId).toBe('version-a:item:1:shared-album-1');
    expect(secondPreview.archiveItems[0].externalId).toBe('version-b:item:1:shared-album-1');
  });

  it('namespaces archive item ids by rank even when Anontraveler reuses item ids', async () => {
    const firstRankPayload = {
      data: {
        article: { _id: 'version-a', title: 'First rank', content: '' },
        items: [
          {
            _id: 'reused-item-1',
            rank_order: 0,
            album_id: { _id: 'shared-album-1' },
            main_artist_id: { _id: 'artist-1', name: 'Shared Artist' },
            main_album: { _id: 'shared-album-1', title: 'Shared Album', artists: [{ _id: 'artist-1', name: 'Shared Artist' }] },
          },
        ],
      },
    };
    const secondRankPayload = {
      data: {
        article: { _id: 'version-b', title: 'Second rank', content: '' },
        items: [
          {
            _id: 'reused-item-1',
            rank_order: 0,
            album_id: { _id: 'shared-album-1' },
            main_artist_id: { _id: 'artist-1', name: 'Shared Artist' },
            main_album: { _id: 'shared-album-1', title: 'Shared Album', artists: [{ _id: 'artist-1', name: 'Shared Artist' }] },
          },
        ],
      },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => firstRankPayload })
      .mockResolvedValueOnce({ ok: true, json: async () => secondRankPayload });
    vi.stubGlobal('fetch', fetchMock);
    const { previewAnontravelerImport } = await import('./anontraveler.service');

    const firstPreview = await previewAnontravelerImport('https://www.anontraveler.com/rank/version/version-a');
    const secondPreview = await previewAnontravelerImport('https://www.anontraveler.com/rank/version/version-b');

    expect(firstPreview.archiveItems[0].externalId).toBe('version-a:item:reused-item-1:shared-album-1');
    expect(secondPreview.archiveItems[0].externalId).toBe('version-b:item:reused-item-1:shared-album-1');
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

  it('parses rank directory links into pending index items', async () => {
    const { parseAnontravelerRankDirectory } = await import('./anontraveler.service');
    const discoveredAt = '2026-07-08T01:00:00.000Z';

    expect(
      parseAnontravelerRankDirectory(
        `
          <a href="/rank/version/version-1">Classic rock guide</a>
          <span>496 albums</span>
          <a href="https://www.anontraveler.com/rank/rank/rank-2">2024 albums</a>
          <span>100 items</span>
          <a href="/artist/not-a-rank">Ignored artist</a>
        `,
        discoveredAt,
      ),
    ).toEqual([
      {
        title: 'Classic rock guide',
        versionId: 'version-1',
        sourceUrl: 'https://www.anontraveler.com/rank/version/version-1',
        itemCount: 496,
        status: 'pending',
        discoveredAt,
        lastImportedAt: null,
      },
      {
        title: '2024 albums',
        versionId: 'rank-2',
        sourceUrl: 'https://www.anontraveler.com/rank/rank/rank-2',
        itemCount: 100,
        status: 'pending',
        discoveredAt,
        lastImportedAt: null,
      },
    ]);
  });

  it('merges repeated directory scans without overwriting import state', async () => {
    const { mergeAnontravelerRankDirectoryItems } = await import('./anontraveler.service');

    expect(
      mergeAnontravelerRankDirectoryItems(
        [
          {
            title: 'Old title',
            versionId: 'version-1',
            sourceUrl: 'https://www.anontraveler.com/rank/version/version-1',
            itemCount: null,
            status: 'imported',
            discoveredAt: '2026-07-01T00:00:00.000Z',
            lastImportedAt: '2026-07-02T00:00:00.000Z',
          },
        ],
        [
          {
            title: 'New title',
            versionId: 'version-1',
            sourceUrl: 'https://www.anontraveler.com/rank/version/version-1',
            itemCount: 496,
            status: 'pending',
            discoveredAt: '2026-07-08T00:00:00.000Z',
            lastImportedAt: null,
          },
        ],
      ),
    ).toEqual([
      {
        title: 'New title',
        versionId: 'version-1',
        sourceUrl: 'https://www.anontraveler.com/rank/version/version-1',
        itemCount: 496,
        status: 'imported',
        discoveredAt: '2026-07-01T00:00:00.000Z',
        lastImportedAt: '2026-07-02T00:00:00.000Z',
      },
    ]);
  });

  it('rejects non-directory scan URLs', async () => {
    const { scanAnontravelerRankDirectory } = await import('./anontraveler.service');

    await expect(scanAnontravelerRankDirectory('https://www.anontraveler.com/rank/version/version-1')).rejects.toThrow(
      'Only the Anontraveler rank directory URL is supported for scanning.',
    );
  });

  it('scans only the directory page and does not fetch rank details', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          ranks: [{ _id: 'version-1', title: 'Classic rock guide' }],
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { scanAnontravelerRankDirectory } = await import('./anontraveler.service');

    await expect(
      scanAnontravelerRankDirectory('https://www.anontraveler.com/rank', '2026-07-08T01:00:00.000Z'),
    ).resolves.toEqual([
      expect.objectContaining({
        title: 'Classic rock guide',
        versionId: 'version-1',
        status: 'pending',
      }),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://www.anontraveler.com/api/rank/ranks/all/0', {
      headers: { accept: 'application/json' },
    });
  });

  it('maps the real Anontraveler rank directory API into selectable rank URLs', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          pages: { total: 82, pageNow: 1, perPage: 10 },
          ranks: [
            {
              _id: '644bca772bf0db963b0b5642',
              title: '中国通俗音乐',
              desc: '中国的各种音乐',
              type: { index: 2, name: '专辑榜' },
            },
            {
              _id: '69259dcf5a353131fe005487',
              title: '日本音乐',
              desc: '涵盖日本流行、实验、摇滚等各种内容',
              type: { index: 2, name: '专辑榜' },
            },
          ],
        },
        rstno: 1,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { scanAnontravelerRankDirectory } = await import('./anontraveler.service');

    await expect(
      scanAnontravelerRankDirectory('https://www.anontraveler.com/rank', '2026-07-08T01:00:00.000Z'),
    ).resolves.toEqual([
      {
        title: '中国通俗音乐',
        versionId: '644bca772bf0db963b0b5642',
        sourceUrl: 'https://www.anontraveler.com/rank/rank/644bca772bf0db963b0b5642',
        itemCount: null,
        status: 'pending',
        discoveredAt: '2026-07-08T01:00:00.000Z',
        lastImportedAt: null,
      },
      {
        title: '日本音乐',
        versionId: '69259dcf5a353131fe005487',
        sourceUrl: 'https://www.anontraveler.com/rank/rank/69259dcf5a353131fe005487',
        itemCount: null,
        status: 'pending',
        discoveredAt: '2026-07-08T01:00:00.000Z',
        lastImportedAt: null,
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://www.anontraveler.com/api/rank/ranks/all/0', {
      headers: { accept: 'application/json' },
    });
  });

  it('loads a paged rank directory and reports whether more pages are available', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          pages: { total: 12, pageNow: 2, perPage: 10 },
          ranks: [
            { _id: 'rank-2', title: 'Second page rank' },
            { _id: 'rank-2', title: 'Duplicated rank' },
          ],
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { scanAnontravelerRankDirectoryPage } = await import('./anontraveler.service');

    await expect(scanAnontravelerRankDirectoryPage(1, '2026-07-08T01:00:00.000Z')).resolves.toEqual({
      items: [
        {
          title: 'Second page rank',
          versionId: 'rank-2',
          sourceUrl: 'https://www.anontraveler.com/rank/rank/rank-2',
          itemCount: null,
          status: 'pending',
          discoveredAt: '2026-07-08T01:00:00.000Z',
          lastImportedAt: null,
        },
      ],
      total: 12,
      page: 1,
      perPage: 10,
      hasMore: false,
    });
    expect(fetchMock).toHaveBeenCalledWith('https://www.anontraveler.com/api/rank/ranks/all/1', {
      headers: { accept: 'application/json' },
    });
  });

  it('marks earlier rank directory pages as having more pages', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          pages: { total: 12, pageNow: 1, perPage: 10 },
          ranks: [{ _id: 'rank-1', title: 'First page rank' }],
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { scanAnontravelerRankDirectoryPage } = await import('./anontraveler.service');

    await expect(scanAnontravelerRankDirectoryPage(0, '2026-07-08T01:00:00.000Z')).resolves.toMatchObject({
      total: 12,
      page: 0,
      perPage: 10,
      hasMore: true,
    });
  });
});
