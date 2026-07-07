import { describe, expect, it, vi } from 'vitest';

import { parseAnontravelerVersionUrl, previewAnontravelerImport } from './anontraveler.service';

const publicRankPayload = {
  data: {
    pages: { total: 1, pageNow: 1, perPage: 12 },
    info: {
      _id: '6728a34bf606a567b7054484',
      title: '2024 albums',
      desc: 'Annual album ranking.',
    },
    items: [
      {
        _id: '6728a9ffee2ae416550bfd5c',
        rank_order: 1,
        album_id: { _id: '665000f0f91bac7eca08a1f6' },
        main_artist_id: { _id: '665000e9f91bac7eca08a1f3', name: 'Artist One' },
        main_album: {
          _id: '665000f0f91bac7eca08a1f6',
          title: 'No, no!',
          primary_img: 'https://pic.anontraveler.com/metas/albums/cover.jpg',
          year: 2024,
          album_type: { index: 0, name: 'Studio album' },
          styles: [{ name: 'Pop/Rock' }],
          main_artist: { _id: '665000e9f91bac7eca08a1f3', name: 'Artist One' },
        },
      },
    ],
  },
};

const rankVersionsPayload = {
  data: {
    articles: [
      {
        _id: 'version-detail-1',
        title: 'Version detail',
        short_subs: [{ _id: 'version-item-1', info: { _id: '665000f0f91bac7eca08a1f6' }, rank_order: 0 }],
      },
    ],
  },
};

const rankVersionDetailPayload = {
  data: {
    article: {
      _id: 'version-detail-1',
      title: 'Version detail',
      content: 'Version intro.',
    },
    items: [
      {
        _id: 'version-item-1',
        content: 'Imported album comment.',
        rank_order: 0,
        album_id: { _id: '665000f0f91bac7eca08a1f6' },
        main_artist_id: { _id: '665000e9f91bac7eca08a1f3', name: 'Artist One' },
        main_album: publicRankPayload.data.items[0].main_album,
      },
    ],
  },
};

describe('Anontraveler public rank URLs', () => {
  it('parses Anontraveler public rank URLs', () => {
    expect(
      parseAnontravelerVersionUrl('https://www.anontraveler.com/rank/rank/6728a34bf606a567b7054484'),
    ).toEqual({
      versionId: '6728a34bf606a567b7054484',
      apiUrl: 'https://www.anontraveler.com/api/rank/rank/6728a34bf606a567b7054484',
      sourceKind: 'rank',
    });
  });

  it('fetches public rank JSON and maps version detail comments into a preview', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => publicRankPayload })
      .mockResolvedValueOnce({ ok: true, json: async () => rankVersionsPayload })
      .mockResolvedValueOnce({ ok: true, json: async () => rankVersionDetailPayload });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      previewAnontravelerImport('https://www.anontraveler.com/rank/rank/6728a34bf606a567b7054484'),
    ).resolves.toMatchObject({
      versionId: '6728a34bf606a567b7054484',
      collection: {
        externalId: '6728a34bf606a567b7054484',
        title: '2024 albums',
        description: 'Annual album ranking.',
        source: 'anontraveler',
        collectionType: 'album_rank',
      },
      artists: [{ externalId: '665000e9f91bac7eca08a1f3', name: 'Artist One' }],
      albums: [
        {
          externalId: '665000f0f91bac7eca08a1f6',
          title: 'No, no!',
          artistName: 'Artist One',
          releaseYear: 2024,
          coverUrl: 'https://pic.anontraveler.com/metas/albums/cover.jpg',
          styles: ['Pop/Rock'],
          albumType: 'Studio album',
          note: 'Imported album comment.',
        },
      ],
      archiveItems: [
        {
          externalId: '6728a34bf606a567b7054484:item:6728a9ffee2ae416550bfd5c:665000f0f91bac7eca08a1f6',
          albumExternalId: '665000f0f91bac7eca08a1f6',
          displayTitle: 'No, no!',
          position: 1,
          note: 'Imported album comment.',
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith('https://www.anontraveler.com/api/rank/rank/6728a34bf606a567b7054484', {
      headers: { accept: 'application/json' },
    });
    expect(fetchMock).toHaveBeenCalledWith('https://www.anontraveler.com/api/rank/versions/6728a34bf606a567b7054484', {
      headers: { accept: 'application/json' },
    });
    expect(fetchMock).toHaveBeenCalledWith('https://www.anontraveler.com/api/rank/version/version-detail-1', {
      headers: { accept: 'application/json' },
    });
  });
});
