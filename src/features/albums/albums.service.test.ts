import { beforeEach, describe, expect, it, vi } from 'vitest';

const orderMock = vi.fn();
const maybeSingleMock = vi.fn();
const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const inMock = vi.fn();
const updateEqMock = vi.fn();
const deleteEqMock = vi.fn();
const selectMock = vi.fn();
const insertMock = vi.fn();
const updateMock = vi.fn(() => ({ eq: updateEqMock }));
const deleteMock = vi.fn(() => ({ eq: deleteEqMock }));
const getSessionMock = vi.fn();
const fromMock = vi.fn((_tableName?: string) => ({
  delete: deleteMock,
  insert: insertMock,
  select: selectMock,
  update: updateMock,
}));
const getSupabaseMock = vi.fn(() => ({
  auth: { getSession: getSessionMock },
  from: fromMock,
}));

vi.mock('../../lib/supabase', () => ({
  getSupabase: () => getSupabaseMock(),
}));

function createTrackedDeferred<T>() {
  let resolve!: (value: T) => void;
  let isResolved = false;
  const promise = new Promise<T>((nextResolve) => {
    resolve = (value: T) => {
      isResolved = true;
      nextResolve(value);
    };
  });

  return {
    promise,
    resolve,
    get isResolved() {
      return isResolved;
    },
  };
}

async function flushMicrotasks(times = 5): Promise<void> {
  for (let index = 0; index < times; index += 1) {
    await Promise.resolve();
  }
}

describe('albums.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    window.localStorage.clear();
    selectMock.mockImplementation(() => ({ order: orderMock }));
    eqMock.mockImplementation(() => ({ maybeSingle: maybeSingleMock }));
    fromMock.mockImplementation(() => ({ delete: deleteMock, insert: insertMock, select: selectMock, update: updateMock }));
    getSupabaseMock.mockReturnValue({
      auth: { getSession: getSessionMock },
      from: fromMock,
    });
  });

  it('lists albums from Supabase', async () => {
    orderMock.mockResolvedValue({
      data: [
        {
          id: 'album-1',
          title: 'Axis: Bold as Love',
          release_year: 1967,
          album_type: 'album',
          notes: 'Second studio album.',
          artists: { name: 'Jimi Hendrix' },
        },
      ],
      error: null,
    });
    const { listAlbums } = await import('./albums.service');

    await expect(listAlbums()).resolves.toEqual([
      {
        id: 'album-1',
        title: 'Axis: Bold as Love',
        artistName: 'Jimi Hendrix',
        releaseYear: 1967,
        albumType: 'album',
        notes: 'Second studio album.',
      },
    ]);
    expect(fromMock).toHaveBeenCalledWith('albums');
    expect(selectMock).toHaveBeenCalledWith('id,title,release_year,album_type,notes,artists(name)');
    expect(orderMock).toHaveBeenCalledWith('updated_at', { ascending: false });
  });

  it('lists import collection options without loading album rows', async () => {
    const collectionOrderMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'collection-1',
          title: 'Classic rock guide',
          source: 'anontraveler',
          source_url: 'https://example.test/rank/version/1',
          description: 'Albums to explore.',
        },
      ],
      error: null,
    });
    const albumInMock = vi.fn();
    fromMock.mockImplementation((tableName?: string) => {
      if (tableName === 'archive_collections') {
        return {
          delete: deleteMock,
          insert: insertMock,
          select: vi.fn(() => ({ order: collectionOrderMock })),
          update: updateMock,
        };
      }
      if (tableName === 'albums') {
        return { delete: deleteMock, insert: insertMock, select: vi.fn(() => ({ in: albumInMock })), update: updateMock };
      }
      return { delete: deleteMock, insert: insertMock, select: selectMock, update: updateMock };
    });
    const { listAlbumCollectionOptions } = await import('./albums.service');

    await expect(listAlbumCollectionOptions()).resolves.toEqual([
      {
        id: 'collection-1',
        title: 'Classic rock guide',
        source: 'anontraveler',
        sourceUrl: 'https://example.test/rank/version/1',
        description: 'Albums to explore.',
      },
    ]);
    expect(albumInMock).not.toHaveBeenCalled();
  });

  it('loads a single import collection by id with its albums', async () => {
    const collectionEqMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'collection-1',
          title: 'Classic rock guide',
          source: 'anontraveler',
          source_url: 'https://example.test/rank/version/1',
          description: 'Albums to explore.',
        },
      ],
      error: null,
    });
    const itemOrderMock = vi.fn().mockResolvedValue({
      data: [{ collection_id: 'collection-1', entity_id: 'album-1', position: 7, note: 'Archive item note.' }],
      error: null,
    });
    const albumInMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'album-1',
          title: 'Axis: Bold as Love',
          release_year: 1967,
          album_type: 'album',
          notes: 'Second studio album.',
          artists: { name: 'Jimi Hendrix' },
        },
      ],
      error: null,
    });
    const externalInMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const externalEqMock = vi.fn(() => ({ in: externalInMock }));
    const itemEntityEqMock = vi.fn(() => ({ order: itemOrderMock }));
    const itemEqMock = vi.fn(() => ({ eq: itemEntityEqMock }));
    fromMock.mockImplementation((tableName?: string) => {
      if (tableName === 'archive_collections') {
        return { delete: deleteMock, insert: insertMock, select: vi.fn(() => ({ eq: collectionEqMock })), update: updateMock };
      }
      if (tableName === 'archive_items') {
        return { delete: deleteMock, insert: insertMock, select: vi.fn(() => ({ eq: itemEqMock })), update: updateMock };
      }
      if (tableName === 'albums') {
        return { delete: deleteMock, insert: insertMock, select: vi.fn(() => ({ in: albumInMock })), update: updateMock };
      }
      if (tableName === 'external_sources') {
        return { delete: deleteMock, insert: insertMock, select: vi.fn(() => ({ eq: externalEqMock })), update: updateMock };
      }
      return { delete: deleteMock, insert: insertMock, select: selectMock, update: updateMock };
    });
    const { getAlbumCollectionById } = await import('./albums.service');

    await expect(getAlbumCollectionById('collection-1')).resolves.toEqual(
      expect.objectContaining({
        id: 'collection-1',
        albums: [
          expect.objectContaining({
            id: 'album-1',
            title: 'Axis: Bold as Love',
            rank: 7,
            reviewNote: 'Archive item note.',
          }),
        ],
      }),
    );
    expect(collectionEqMock).toHaveBeenCalledWith('id', 'collection-1');
    expect(itemEqMock).toHaveBeenCalledWith('collection_id', 'collection-1');
    expect(itemEntityEqMock).toHaveBeenCalledWith('entity_type', 'album');
  });

  it('loads only the requested album page for a large collection while keeping the total count', async () => {
    const collectionEqMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'collection-1',
          title: 'Large import guide',
          source: 'anontraveler',
          source_url: 'https://example.test/rank/version/large',
          description: 'Large import.',
        },
      ],
      error: null,
    });
    const itemRangeMock = vi.fn().mockResolvedValue({
      data: [{ collection_id: 'collection-1', entity_id: 'album-26', position: 26, note: 'Page note.' }],
      count: 496,
      error: null,
    });
    const itemOrderMock = vi.fn(() => ({ range: itemRangeMock }));
    const albumInMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'album-26',
          title: 'Album 26',
          release_year: 1970,
          album_type: 'album',
          notes: '',
          artists: { name: 'Artist 26' },
        },
      ],
      error: null,
    });
    const externalInMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const externalEqMock = vi.fn(() => ({ in: externalInMock }));
    const itemEntityEqMock = vi.fn(() => ({ order: itemOrderMock }));
    const itemEqMock = vi.fn(() => ({ eq: itemEntityEqMock }));
    fromMock.mockImplementation((tableName?: string) => {
      if (tableName === 'archive_collections') {
        return { delete: deleteMock, insert: insertMock, select: vi.fn(() => ({ eq: collectionEqMock })), update: updateMock };
      }
      if (tableName === 'archive_items') {
        return {
          delete: deleteMock,
          insert: insertMock,
          select: vi.fn(() => ({ eq: itemEqMock })),
          update: updateMock,
        };
      }
      if (tableName === 'albums') {
        return { delete: deleteMock, insert: insertMock, select: vi.fn(() => ({ in: albumInMock })), update: updateMock };
      }
      if (tableName === 'external_sources') {
        return { delete: deleteMock, insert: insertMock, select: vi.fn(() => ({ eq: externalEqMock })), update: updateMock };
      }
      return { delete: deleteMock, insert: insertMock, select: selectMock, update: updateMock };
    });
    const { getAlbumCollectionById } = await import('./albums.service');

    await expect(getAlbumCollectionById('collection-1', { pageIndex: 1, pageSize: 25 })).resolves.toEqual(
      expect.objectContaining({
        id: 'collection-1',
        totalAlbumCount: 496,
        albums: [expect.objectContaining({ id: 'album-26', rank: 26 })],
      }),
    );

    expect(itemRangeMock).toHaveBeenCalledWith(25, 49);
    expect(albumInMock).toHaveBeenCalledWith('id', ['album-26']);
    expect(externalInMock).toHaveBeenCalledWith('entity_id', ['album-26']);
  });

  it('lists albums grouped by public import collection with imported metadata', async () => {
    const collectionOrderMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'collection-1',
          title: 'Classic rock guide',
          source: 'anontraveler',
          source_url: 'https://example.test/rank/version/1',
          description: 'Albums to explore.',
        },
      ],
      error: null,
    });
    const itemOrderMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'item-1',
          collection_id: 'collection-1',
          entity_id: 'album-1',
          position: 7,
          note: 'Archive item note.',
        },
      ],
      error: null,
    });
    const albumInMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'album-1',
          title: 'Axis: Bold as Love',
          release_year: 1967,
          album_type: 'album',
          notes: 'Second studio album.',
          artists: { name: 'Jimi Hendrix' },
        },
      ],
      error: null,
    });
    const externalInMock = vi.fn().mockResolvedValue({
      data: [
        {
          entity_id: 'album-1',
          raw_payload: {
            metadata: {
              coverUrl: 'https://img.example.test/axis.jpg',
              styles: ['Psychedelic rock', 'Blues rock'],
              note: 'Essential guitar record.',
            },
          },
        },
      ],
      error: null,
    });
    const externalEqMock = vi.fn(() => ({ in: externalInMock }));
    const itemEqMock = vi.fn(() => ({ order: itemOrderMock }));
    const itemInMock = vi.fn(() => ({ eq: itemEqMock }));
    fromMock.mockImplementation((tableName?: string) => {
      if (tableName === 'archive_collections') {
        return {
          delete: deleteMock,
          insert: insertMock,
          select: vi.fn(() => ({ order: collectionOrderMock })),
          update: updateMock,
        };
      }
      if (tableName === 'archive_items') {
        return { delete: deleteMock, insert: insertMock, select: vi.fn(() => ({ in: itemInMock })), update: updateMock };
      }
      if (tableName === 'albums') {
        return { delete: deleteMock, insert: insertMock, select: vi.fn(() => ({ in: albumInMock })), update: updateMock };
      }
      if (tableName === 'external_sources') {
        return {
          delete: deleteMock,
          insert: insertMock,
          select: vi.fn(() => ({ eq: externalEqMock })),
          update: updateMock,
        };
      }
      return { delete: deleteMock, insert: insertMock, select: selectMock, update: updateMock };
    });
    const { listAlbumCollections } = await import('./albums.service');

    await expect(listAlbumCollections()).resolves.toEqual([
      {
        id: 'collection-1',
        title: 'Classic rock guide',
        source: 'anontraveler',
        sourceUrl: 'https://example.test/rank/version/1',
        description: 'Albums to explore.',
        totalAlbumCount: 1,
        albums: [
          {
            id: 'album-1',
            title: 'Axis: Bold as Love',
            artistName: 'Jimi Hendrix',
            releaseYear: 1967,
            albumType: 'album',
            notes: 'Second studio album.',
            rank: 7,
            coverUrl: 'https://img.example.test/axis.jpg',
            styles: ['Psychedelic rock', 'Blues rock'],
            reviewNote: 'Essential guitar record.',
          },
        ],
      },
    ]);
    expect(itemInMock).toHaveBeenCalledWith('collection_id', ['collection-1']);
    expect(itemEqMock).toHaveBeenCalledWith('entity_type', 'album');
    expect(albumInMock).toHaveBeenCalledWith('id', ['album-1']);
    expect(externalEqMock).toHaveBeenCalledWith('entity_type', 'album');
    expect(externalInMock).toHaveBeenCalledWith('entity_id', ['album-1']);
  });

  it('chunks collection album lookups to avoid oversized Supabase in filters', async () => {
    const collectionOrderMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'collection-1',
          title: 'Large import guide',
          source: 'anontraveler',
          source_url: 'https://example.test/rank/version/large',
          description: 'Large import.',
        },
      ],
      error: null,
    });
    const itemRows = Array.from({ length: 251 }, (_, index) => ({
      collection_id: 'collection-1',
      entity_id: `album-${index + 1}`,
      position: index + 1,
      note: '',
    }));
    const itemOrderMock = vi.fn().mockResolvedValue({ data: itemRows, error: null });
    const albumInMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const externalInMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const externalEqMock = vi.fn(() => ({ in: externalInMock }));
    const itemEqMock = vi.fn(() => ({ order: itemOrderMock }));
    const itemInMock = vi.fn(() => ({ eq: itemEqMock }));
    fromMock.mockImplementation((tableName?: string) => {
      if (tableName === 'archive_collections') {
        return {
          delete: deleteMock,
          insert: insertMock,
          select: vi.fn(() => ({ order: collectionOrderMock })),
          update: updateMock,
        };
      }
      if (tableName === 'archive_items') {
        return { delete: deleteMock, insert: insertMock, select: vi.fn(() => ({ in: itemInMock })), update: updateMock };
      }
      if (tableName === 'albums') {
        return { delete: deleteMock, insert: insertMock, select: vi.fn(() => ({ in: albumInMock })), update: updateMock };
      }
      if (tableName === 'external_sources') {
        return {
          delete: deleteMock,
          insert: insertMock,
          select: vi.fn(() => ({ eq: externalEqMock })),
          update: updateMock,
        };
      }
      return { delete: deleteMock, insert: insertMock, select: selectMock, update: updateMock };
    });
    const { listAlbumCollections } = await import('./albums.service');

    await expect(listAlbumCollections()).resolves.toEqual([
      expect.objectContaining({ id: 'collection-1', albums: [] }),
    ]);

    expect(albumInMock).toHaveBeenCalledTimes(2);
    expect(albumInMock.mock.calls[0][1]).toHaveLength(200);
    expect(albumInMock.mock.calls[1][1]).toHaveLength(51);
    expect(externalInMock).toHaveBeenCalledTimes(2);
    expect(externalInMock.mock.calls[0][1]).toHaveLength(200);
    expect(externalInMock.mock.calls[1][1]).toHaveLength(51);
  });

  it('loads large collection album rows and metadata in limited parallel batches', async () => {
    const collectionEqMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'collection-1',
          title: 'Large import guide',
          source: 'anontraveler',
          source_url: 'https://example.test/rank/version/large',
          description: 'Large import.',
        },
      ],
      error: null,
    });
    const itemRows = Array.from({ length: 401 }, (_, index) => ({
      collection_id: 'collection-1',
      entity_id: `album-${index + 1}`,
      position: index + 1,
      note: '',
    }));
    const itemOrderMock = vi.fn().mockResolvedValue({ data: itemRows, error: null });
    const albumRequests = Array.from({ length: 3 }, () => createTrackedDeferred<{ data: []; error: null }>());
    const externalRequests = Array.from({ length: 3 }, () => createTrackedDeferred<{ data: []; error: null }>());
    const albumInMock = vi.fn(() => albumRequests[albumInMock.mock.calls.length - 1].promise);
    const externalInMock = vi.fn(() => externalRequests[externalInMock.mock.calls.length - 1].promise);
    const externalEqMock = vi.fn(() => ({ in: externalInMock }));
    const itemEntityEqMock = vi.fn(() => ({ order: itemOrderMock }));
    const itemEqMock = vi.fn(() => ({ eq: itemEntityEqMock }));
    fromMock.mockImplementation((tableName?: string) => {
      if (tableName === 'archive_collections') {
        return { delete: deleteMock, insert: insertMock, select: vi.fn(() => ({ eq: collectionEqMock })), update: updateMock };
      }
      if (tableName === 'archive_items') {
        return { delete: deleteMock, insert: insertMock, select: vi.fn(() => ({ eq: itemEqMock })), update: updateMock };
      }
      if (tableName === 'albums') {
        return { delete: deleteMock, insert: insertMock, select: vi.fn(() => ({ in: albumInMock })), update: updateMock };
      }
      if (tableName === 'external_sources') {
        return {
          delete: deleteMock,
          insert: insertMock,
          select: vi.fn(() => ({ eq: externalEqMock })),
          update: updateMock,
        };
      }
      return { delete: deleteMock, insert: insertMock, select: selectMock, update: updateMock };
    });
    const { getAlbumCollectionById } = await import('./albums.service');

    const resultPromise = getAlbumCollectionById('collection-1');
    await flushMicrotasks();

    expect(albumInMock).toHaveBeenCalledTimes(3);
    expect(externalInMock).toHaveBeenCalledTimes(3);
    expect(albumRequests[0].isResolved).toBe(false);
    expect(externalRequests[0].isResolved).toBe(false);

    albumRequests.forEach((request) => request.resolve({ data: [], error: null }));
    externalRequests.forEach((request) => request.resolve({ data: [], error: null }));
    await expect(resultPromise).resolves.toEqual(expect.objectContaining({ id: 'collection-1', albums: [] }));
  });

  it('preserves the original source ranking inside each import collection', async () => {
    const collectionOrderMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'collection-1',
          title: 'Year-by-year canon',
          source: 'anontraveler',
          source_url: 'https://example.test/rank/version/year-canon',
          description: 'One representative album per year.',
        },
      ],
      error: null,
    });
    const itemOrderMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'item-2',
          collection_id: 'collection-1',
          entity_id: 'album-2',
          position: 2,
          note: '',
        },
        {
          id: 'item-1',
          collection_id: 'collection-1',
          entity_id: 'album-1',
          position: 1,
          note: '',
        },
      ],
      error: null,
    });
    const albumInMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'album-2',
          title: 'Second representative album',
          release_year: 1968,
          album_type: 'album',
          notes: '',
          artists: { name: 'Second Artist' },
        },
        {
          id: 'album-1',
          title: 'First representative album',
          release_year: 1967,
          album_type: 'album',
          notes: '',
          artists: { name: 'First Artist' },
        },
      ],
      error: null,
    });
    const externalInMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const externalEqMock = vi.fn(() => ({ in: externalInMock }));
    const itemEqMock = vi.fn(() => ({ order: itemOrderMock }));
    const itemInMock = vi.fn(() => ({ eq: itemEqMock }));
    fromMock.mockImplementation((tableName?: string) => {
      if (tableName === 'archive_collections') {
        return {
          delete: deleteMock,
          insert: insertMock,
          select: vi.fn(() => ({ order: collectionOrderMock })),
          update: updateMock,
        };
      }
      if (tableName === 'archive_items') {
        return { delete: deleteMock, insert: insertMock, select: vi.fn(() => ({ in: itemInMock })), update: updateMock };
      }
      if (tableName === 'albums') {
        return { delete: deleteMock, insert: insertMock, select: vi.fn(() => ({ in: albumInMock })), update: updateMock };
      }
      if (tableName === 'external_sources') {
        return {
          delete: deleteMock,
          insert: insertMock,
          select: vi.fn(() => ({ eq: externalEqMock })),
          update: updateMock,
        };
      }
      return { delete: deleteMock, insert: insertMock, select: selectMock, update: updateMock };
    });
    const { listAlbumCollections } = await import('./albums.service');

    const collections = await listAlbumCollections();

    expect(collections[0].albums.map((album) => album.rank)).toEqual([1, 2]);
    expect(collections[0].albums.map((album) => album.title)).toEqual([
      'First representative album',
      'Second representative album',
    ]);
  });

  it('uses imported metadata artist names when album artist links are stale', async () => {
    const collectionOrderMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'collection-1',
          title: 'Classic rock guide',
          source: 'anontraveler',
          source_url: 'https://example.test/rank/version/1',
          description: 'Albums to explore.',
        },
      ],
      error: null,
    });
    const itemOrderMock = vi.fn().mockResolvedValue({
      data: [
        {
          collection_id: 'collection-1',
          entity_id: 'album-1',
          position: 1,
          note: '',
        },
      ],
      error: null,
    });
    const albumInMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'album-1',
          title: 'Please Please Me',
          release_year: 1963,
          album_type: 'album',
          notes: '',
          artists: { name: '13th Floor Elevators' },
        },
      ],
      error: null,
    });
    const externalInMock = vi.fn().mockResolvedValue({
      data: [
        {
          entity_id: 'album-1',
          raw_payload: {
            metadata: {
              artistName: 'The Beatles',
              coverUrl: 'https://img.example.test/please.jpg',
              styles: ['Beat music'],
              note: 'Debut album.',
            },
          },
        },
      ],
      error: null,
    });
    const externalEqMock = vi.fn(() => ({ in: externalInMock }));
    const itemEqMock = vi.fn(() => ({ order: itemOrderMock }));
    const itemInMock = vi.fn(() => ({ eq: itemEqMock }));
    fromMock.mockImplementation((tableName?: string) => {
      if (tableName === 'archive_collections') {
        return {
          delete: deleteMock,
          insert: insertMock,
          select: vi.fn(() => ({ order: collectionOrderMock })),
          update: updateMock,
        };
      }
      if (tableName === 'archive_items') {
        return { delete: deleteMock, insert: insertMock, select: vi.fn(() => ({ in: itemInMock })), update: updateMock };
      }
      if (tableName === 'albums') {
        return { delete: deleteMock, insert: insertMock, select: vi.fn(() => ({ in: albumInMock })), update: updateMock };
      }
      if (tableName === 'external_sources') {
        return {
          delete: deleteMock,
          insert: insertMock,
          select: vi.fn(() => ({ eq: externalEqMock })),
          update: updateMock,
        };
      }
      return { delete: deleteMock, insert: insertMock, select: selectMock, update: updateMock };
    });
    const { listAlbumCollections } = await import('./albums.service');

    const collections = await listAlbumCollections();

    expect(collections[0].albums[0].artistName).toBe('The Beatles');
  });

  it('loads an album detail from Supabase', async () => {
    selectMock.mockReturnValue({ eq: eqMock });
    maybeSingleMock.mockResolvedValue({
      data: {
        id: 'album-1',
        title: 'Axis: Bold as Love',
        release_year: 1967,
        album_type: 'album',
        notes: 'Second studio album.',
        artists: { name: 'Jimi Hendrix' },
      },
      error: null,
    });
    const { getAlbumById } = await import('./albums.service');

    await expect(getAlbumById('album-1')).resolves.toEqual({
      id: 'album-1',
      title: 'Axis: Bold as Love',
      artistName: 'Jimi Hendrix',
      releaseYear: 1967,
      albumType: 'album',
      notes: 'Second studio album.',
    });
    expect(fromMock).toHaveBeenCalledWith('albums');
    expect(selectMock).toHaveBeenCalledWith('id,title,release_year,album_type,notes,artists(name)');
    expect(eqMock).toHaveBeenCalledWith('id', 'album-1');
    expect(maybeSingleMock).toHaveBeenCalledWith();
  });

  it('creates an album for the current user', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null });
    insertMock.mockResolvedValue({ error: null });
    const { createAlbum } = await import('./albums.service');

    await createAlbum({
      title: 'New Album',
      artistId: 'artist-1',
      releaseYear: 2026,
      albumType: 'album',
      notes: 'Practice references.',
    });

    expect(fromMock).toHaveBeenCalledWith('albums');
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      artist_id: 'artist-1',
      title: 'New Album',
      release_year: 2026,
      album_type: 'album',
      notes: 'Practice references.',
    });
  });

  it('updates an album in Supabase', async () => {
    updateEqMock.mockResolvedValue({ error: null });
    const { updateAlbum } = await import('./albums.service');

    await updateAlbum('album-1', {
      title: 'Updated Album',
      artistId: null,
      releaseYear: 1968,
      albumType: 'live',
      notes: 'Live notes.',
    });

    expect(fromMock).toHaveBeenCalledWith('albums');
    expect(updateMock).toHaveBeenCalledWith({
      artist_id: null,
      title: 'Updated Album',
      release_year: 1968,
      album_type: 'live',
      notes: 'Live notes.',
    });
    expect(updateEqMock).toHaveBeenCalledWith('id', 'album-1');
  });

  it('deletes an album in Supabase', async () => {
    deleteEqMock.mockResolvedValue({ error: null });
    const { deleteAlbum } = await import('./albums.service');

    await deleteAlbum('album-1');

    expect(fromMock).toHaveBeenCalledWith('albums');
    expect(deleteMock).toHaveBeenCalledWith();
    expect(deleteEqMock).toHaveBeenCalledWith('id', 'album-1');
  });

  it('uses local demo albums when Supabase is not configured', async () => {
    vi.stubEnv('VITE_ENABLE_DEMO_MODE', 'true');
    getSupabaseMock.mockImplementation(() => {
      throw new Error('Missing VITE_SUPABASE_URL');
    });
    window.localStorage.setItem('rockroll.demoSession', JSON.stringify({ user: { id: 'local-demo-user' } }));
    const { createAlbum, listAlbums } = await import('./albums.service');

    await expect(listAlbums()).resolves.toEqual([]);

    await createAlbum({
      title: 'Demo Album',
      artistId: null,
      releaseYear: 1980,
      albumType: 'ep',
      notes: 'Local reference.',
    });

    await expect(listAlbums()).resolves.toEqual([
      expect.objectContaining({
        id: expect.any(String),
        title: 'Demo Album',
        artistName: 'Unknown artist',
        releaseYear: 1980,
        albumType: 'ep',
        notes: 'Local reference.',
      }),
    ]);
  });

  it('updates and deletes local demo albums when Supabase is not configured', async () => {
    vi.stubEnv('VITE_ENABLE_DEMO_MODE', 'true');
    getSupabaseMock.mockImplementation(() => {
      throw new Error('Missing VITE_SUPABASE_URL');
    });
    window.localStorage.setItem('rockroll.demoSession', JSON.stringify({ user: { id: 'local-demo-user' } }));
    window.localStorage.setItem(
      'rockroll.demoAlbums',
      JSON.stringify([
        {
          id: 'local-album-1',
          title: 'Demo Album',
          artistName: 'Unknown artist',
          releaseYear: 1980,
          albumType: 'album',
          notes: 'Local reference.',
        },
      ]),
    );
    const { deleteAlbum, getAlbumById, listAlbums, updateAlbum } = await import('./albums.service');

    await updateAlbum('local-album-1', {
      title: 'Updated Demo Album',
      artistId: null,
      releaseYear: 1981,
      albumType: 'compilation',
      notes: 'Updated local reference.',
    });

    await expect(getAlbumById('local-album-1')).resolves.toEqual(
      expect.objectContaining({
        title: 'Updated Demo Album',
        releaseYear: 1981,
        albumType: 'compilation',
        notes: 'Updated local reference.',
      }),
    );

    await deleteAlbum('local-album-1');

    await expect(listAlbums()).resolves.toEqual([]);
  });
});
