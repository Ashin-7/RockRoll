import { beforeEach, describe, expect, it, vi } from 'vitest';

const orderMock = vi.fn();
const maybeSingleMock = vi.fn();
const updateEqMock = vi.fn();
const deleteEqMock = vi.fn();
const eqOrderMock = vi.fn(() => ({ order: orderMock }));
const eqMaybeSingleMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const selectMock = vi.fn();
const insertMock = vi.fn();
const updateMock = vi.fn(() => ({ eq: updateEqMock }));
const deleteMock = vi.fn(() => ({ eq: deleteEqMock }));
const getSessionMock = vi.fn();
const fromMock = vi.fn(() => ({ delete: deleteMock, insert: insertMock, select: selectMock, update: updateMock }));
const getSupabaseMock = vi.fn(() => ({
  auth: { getSession: getSessionMock },
  from: fromMock,
}));

vi.mock('../../lib/supabase', () => ({
  getSupabase: () => getSupabaseMock(),
}));

function mockSessionWithProfileRole(role: 'admin' | 'user') {
  getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null });
  selectMock.mockReturnValue({ eq: eqMaybeSingleMock });
  maybeSingleMock.mockResolvedValue({ data: { role }, error: null });
}

describe('archive.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    window.localStorage.clear();
    fromMock.mockImplementation(() => ({
      delete: deleteMock,
      insert: insertMock,
      select: selectMock,
      update: updateMock,
    }));
    getSupabaseMock.mockReturnValue({
      auth: { getSession: getSessionMock },
      from: fromMock,
    });
  });

  it('lists archive collections from Supabase', async () => {
    selectMock.mockReturnValue({ order: orderMock });
    orderMock.mockResolvedValue({
      data: [
        {
          id: 'collection-1',
          title: 'Classic rock guide',
          source: 'anontraveler',
          source_url: 'https://example.test/rank/version/1',
          description: 'Albums to explore.',
          collection_type: 'album_rank',
        },
      ],
      error: null,
    });
    const { listArchiveCollections } = await import('./archive.service');

    await expect(listArchiveCollections()).resolves.toEqual([
      {
        id: 'collection-1',
        title: 'Classic rock guide',
        source: 'anontraveler',
        sourceUrl: 'https://example.test/rank/version/1',
        description: 'Albums to explore.',
        collectionType: 'album_rank',
      },
    ]);
    expect(fromMock).toHaveBeenCalledWith('archive_collections');
    expect(selectMock).toHaveBeenCalledWith('id,title,source,source_url,description,collection_type');
    expect(orderMock).toHaveBeenCalledWith('updated_at', { ascending: false });
  });

  it('creates an archive collection for the current user', async () => {
    mockSessionWithProfileRole('admin');
    insertMock.mockResolvedValue({ error: null });
    const { createArchiveCollection } = await import('./archive.service');

    await createArchiveCollection({
      title: 'Classic rock guide',
      source: 'anontraveler',
      sourceUrl: 'https://example.test/rank/version/1',
      description: 'Albums to explore.',
      collectionType: 'album_rank',
    });

    expect(fromMock).toHaveBeenCalledWith('archive_collections');
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      title: 'Classic rock guide',
      source: 'anontraveler',
      source_url: 'https://example.test/rank/version/1',
      description: 'Albums to explore.',
      collection_type: 'album_rank',
    });
  });

  it('rejects archive collection writes for non-admin users', async () => {
    mockSessionWithProfileRole('user');
    const { createArchiveCollection, deleteArchiveCollection, updateArchiveCollection } = await import('./archive.service');

    await expect(
      createArchiveCollection({
        title: 'Classic rock guide',
        source: 'anontraveler',
        sourceUrl: 'https://example.test/rank/version/1',
        description: 'Albums to explore.',
        collectionType: 'album_rank',
      }),
    ).rejects.toThrow('Admin permission is required to manage archive collections.');
    await expect(
      updateArchiveCollection('collection-1', {
        title: 'Updated guide',
        source: 'manual',
        sourceUrl: 'https://example.test/updated',
        description: 'Updated albums to explore.',
        collectionType: 'album_rank',
      }),
    ).rejects.toThrow('Admin permission is required to manage archive collections.');
    await expect(deleteArchiveCollection('collection-1')).rejects.toThrow(
      'Admin permission is required to manage archive collections.',
    );
    expect(insertMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('updates an archive collection in Supabase', async () => {
    mockSessionWithProfileRole('admin');
    updateEqMock.mockResolvedValue({ error: null });
    const { updateArchiveCollection } = await import('./archive.service');

    await updateArchiveCollection('collection-1', {
      title: 'Updated guide',
      source: 'manual',
      sourceUrl: 'https://example.test/updated',
      description: 'Updated albums to explore.',
      collectionType: 'album_rank',
    });

    expect(fromMock).toHaveBeenCalledWith('archive_collections');
    expect(updateMock).toHaveBeenCalledWith({
      title: 'Updated guide',
      source: 'manual',
      source_url: 'https://example.test/updated',
      description: 'Updated albums to explore.',
      collection_type: 'album_rank',
    });
    expect(updateEqMock).toHaveBeenCalledWith('id', 'collection-1');
  });

  it('deletes an archive collection from Supabase', async () => {
    mockSessionWithProfileRole('admin');
    deleteEqMock.mockResolvedValue({ error: null });
    const { deleteArchiveCollection } = await import('./archive.service');

    await deleteArchiveCollection('collection-1');

    expect(fromMock).toHaveBeenCalledWith('archive_collections');
    expect(deleteMock).toHaveBeenCalled();
    expect(deleteEqMock).toHaveBeenCalledWith('id', 'collection-1');
  });

  it('loads a collection detail with ordered items from Supabase', async () => {
    const albumInMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const externalInMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const externalSourceEqMock = vi.fn(() => ({ in: externalInMock }));
    fromMock.mockImplementation((tableName?: string) => {
      if (tableName === 'archive_collections') {
        return { delete: deleteMock, insert: insertMock, select: vi.fn(() => ({ eq: eqMaybeSingleMock })), update: updateMock };
      }
      if (tableName === 'archive_items') {
        return { delete: deleteMock, insert: insertMock, select: vi.fn(() => ({ eq: eqOrderMock })), update: updateMock };
      }
      if (tableName === 'albums') {
        return { delete: deleteMock, insert: insertMock, select: vi.fn(() => ({ in: albumInMock })), update: updateMock };
      }
      if (tableName === 'external_sources') {
        return { delete: deleteMock, insert: insertMock, select: vi.fn(() => ({ eq: externalSourceEqMock })), update: updateMock };
      }
      return { delete: deleteMock, insert: insertMock, select: selectMock, update: updateMock };
    });
    maybeSingleMock.mockResolvedValue({
      data: {
        id: 'collection-1',
        title: 'Classic rock guide',
        source: 'anontraveler',
        source_url: 'https://example.test/rank/version/1',
        description: 'Albums to explore.',
        collection_type: 'album_rank',
      },
      error: null,
    });
    orderMock.mockResolvedValue({
      data: [
        {
          id: 'item-1',
          entity_type: 'album',
          entity_id: 'album-1',
          display_title: 'Please Please Me',
          position: 1,
          note: 'Beat music marker.',
          external_source: 'anontraveler',
          external_id: 'external-item-1',
        },
      ],
      error: null,
    });
    const { getArchiveCollectionById } = await import('./archive.service');

    await expect(getArchiveCollectionById('collection-1')).resolves.toEqual({
      id: 'collection-1',
      title: 'Classic rock guide',
      source: 'anontraveler',
      sourceUrl: 'https://example.test/rank/version/1',
      description: 'Albums to explore.',
      collectionType: 'album_rank',
      items: [
        {
          id: 'item-1',
          entityType: 'album',
          entityId: 'album-1',
          displayTitle: 'Please Please Me',
          position: 1,
          note: 'Beat music marker.',
          externalSource: 'anontraveler',
          externalId: 'external-item-1',
        },
      ],
    });
    expect(fromMock).toHaveBeenCalledWith('archive_collections');
    expect(fromMock).toHaveBeenCalledWith('archive_items');
    expect(orderMock).toHaveBeenCalledWith('position', { ascending: true, nullsFirst: false });
  });

  it('hydrates archive album items with formal metadata first and raw fallback', async () => {
    const albumInMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'album-1',
          cover_url: 'https://formal.example.test/please-please-me.jpg',
          styles: ['Formal beat music'],
        },
      ],
      error: null,
    });
    const albumSelectMock = vi.fn(() => ({ in: albumInMock }));
    const externalInMock = vi.fn();
    const externalSourceEqMock = vi.fn(() => ({ in: externalInMock }));
    const externalSelectMock = vi.fn(() => ({ eq: externalSourceEqMock }));
    fromMock.mockImplementation((tableName?: string) => {
      if (tableName === 'archive_collections') {
        return { delete: deleteMock, insert: insertMock, select: vi.fn(() => ({ eq: eqMaybeSingleMock })), update: updateMock };
      }
      if (tableName === 'archive_items') {
        return { delete: deleteMock, insert: insertMock, select: vi.fn(() => ({ eq: eqOrderMock })), update: updateMock };
      }
      if (tableName === 'albums') {
        return { delete: deleteMock, insert: insertMock, select: albumSelectMock, update: updateMock };
      }
      if (tableName === 'external_sources') {
        return { delete: deleteMock, insert: insertMock, select: externalSelectMock, update: updateMock };
      }
      return { delete: deleteMock, insert: insertMock, select: selectMock, update: updateMock };
    });
    maybeSingleMock.mockResolvedValue({
      data: {
        id: 'collection-1',
        title: 'Classic rock guide',
        source: 'anontraveler',
        source_url: 'https://example.test/rank/version/1',
        description: 'Albums to explore.',
        collection_type: 'album_rank',
      },
      error: null,
    });
    orderMock.mockResolvedValue({
      data: [
        {
          id: 'item-1',
          entity_type: 'album',
          entity_id: 'album-1',
          display_title: 'Please Please Me',
          position: 1,
          note: 'Beat music marker.',
          external_source: 'anontraveler',
          external_id: 'external-item-1',
        },
      ],
      error: null,
    });
    externalInMock.mockResolvedValue({
      data: [
        {
          entity_id: 'album-1',
          raw_payload: {
            metadata: {
              coverUrl: 'https://img.example.test/please-please-me.jpg',
              releaseYear: 1963,
              styles: ['Beat music', 'Rock'],
              note: 'Original preview comment.',
            },
          },
        },
      ],
      error: null,
    });
    const { getArchiveCollectionById } = await import('./archive.service');

    await expect(getArchiveCollectionById('collection-1')).resolves.toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            albumMetadata: {
              coverUrl: 'https://formal.example.test/please-please-me.jpg',
              releaseYear: 1963,
              styles: ['Formal beat music'],
              note: 'Original preview comment.',
            },
          }),
        ],
      }),
    );
    albumInMock.mockResolvedValue({
      data: [{ id: 'album-1', cover_url: null, styles: [] }],
      error: null,
    });
    await expect(getArchiveCollectionById('collection-1')).resolves.toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            albumMetadata: {
              coverUrl: 'https://img.example.test/please-please-me.jpg',
              releaseYear: 1963,
              styles: ['Beat music', 'Rock'],
              note: 'Original preview comment.',
            },
          }),
        ],
      }),
    );
    expect(fromMock).toHaveBeenCalledWith('albums');
    expect(albumSelectMock).toHaveBeenCalledWith('id,cover_url,styles');
    expect(albumInMock).toHaveBeenCalledWith('id', ['album-1']);
    expect(fromMock).toHaveBeenCalledWith('external_sources');
    expect(externalSourceEqMock).toHaveBeenCalledWith('entity_type', 'album');
    expect(externalInMock).toHaveBeenCalledWith('entity_id', ['album-1']);
  });

  it('loads formal album metadata in 200-row chunks without per-item queries', async () => {
    const albumInMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const albumSelectMock = vi.fn(() => ({ in: albumInMock }));
    const externalInMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const externalSourceEqMock = vi.fn(() => ({ in: externalInMock }));
    maybeSingleMock.mockResolvedValue({
      data: {
        id: 'collection-1',
        title: 'Large import guide',
        source: 'anontraveler',
        source_url: 'https://example.test/rank/version/large',
        description: 'Large import.',
        collection_type: 'album_rank',
      },
      error: null,
    });
    orderMock.mockResolvedValue({
      data: Array.from({ length: 251 }, (_, index) => ({
        id: `item-${index + 1}`,
        entity_type: 'album',
        entity_id: `album-${index + 1}`,
        display_title: `Album ${index + 1}`,
        position: index + 1,
        note: '',
        external_source: 'anontraveler',
        external_id: `external-item-${index + 1}`,
      })),
      error: null,
    });
    fromMock.mockImplementation((tableName?: string) => {
      if (tableName === 'archive_collections') {
        return { delete: deleteMock, insert: insertMock, select: vi.fn(() => ({ eq: eqMaybeSingleMock })), update: updateMock };
      }
      if (tableName === 'archive_items') {
        return { delete: deleteMock, insert: insertMock, select: vi.fn(() => ({ eq: eqOrderMock })), update: updateMock };
      }
      if (tableName === 'albums') {
        return { delete: deleteMock, insert: insertMock, select: albumSelectMock, update: updateMock };
      }
      if (tableName === 'external_sources') {
        return {
          delete: deleteMock,
          insert: insertMock,
          select: vi.fn(() => ({ eq: externalSourceEqMock })),
          update: updateMock,
        };
      }
      return { delete: deleteMock, insert: insertMock, select: selectMock, update: updateMock };
    });
    const { getArchiveCollectionById } = await import('./archive.service');

    const result = await getArchiveCollectionById('collection-1');

    expect(result?.items).toHaveLength(251);
    expect(albumSelectMock).toHaveBeenCalledWith('id,cover_url,styles');
    expect(albumInMock).toHaveBeenCalledTimes(2);
    expect(albumInMock.mock.calls[0][1]).toHaveLength(200);
    expect(albumInMock.mock.calls[1][1]).toHaveLength(51);
    expect(externalSourceEqMock).toHaveBeenCalledWith('entity_type', 'album');
    expect(externalInMock).toHaveBeenCalledTimes(1);
    expect(externalInMock.mock.calls[0][1]).toHaveLength(251);
  });

  it('adds an album item to an archive collection', async () => {
    mockSessionWithProfileRole('admin');
    insertMock.mockResolvedValue({ error: null });
    const { addArchiveItem } = await import('./archive.service');

    await addArchiveItem({
      collectionId: 'collection-1',
      entityType: 'album',
      entityId: 'album-1',
      displayTitle: 'Please Please Me',
      position: 1,
      note: 'Beat music marker.',
      externalSource: 'anontraveler',
      externalId: 'external-item-1',
    });

    expect(fromMock).toHaveBeenCalledWith('archive_items');
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      collection_id: 'collection-1',
      entity_type: 'album',
      entity_id: 'album-1',
      display_title: 'Please Please Me',
      position: 1,
      note: 'Beat music marker.',
      external_source: 'anontraveler',
      external_id: 'external-item-1',
    });
  });

  it('rejects archive item writes for non-admin users', async () => {
    mockSessionWithProfileRole('user');
    const { addArchiveItem, deleteArchiveItem, updateArchiveItem } = await import('./archive.service');

    await expect(
      addArchiveItem({
        collectionId: 'collection-1',
        entityType: 'album',
        entityId: 'album-1',
        displayTitle: 'Please Please Me',
        position: 1,
        note: 'Beat music marker.',
        externalSource: 'anontraveler',
        externalId: 'external-item-1',
      }),
    ).rejects.toThrow('Admin permission is required to manage archive items.');
    await expect(
      updateArchiveItem({
        itemId: 'item-1',
        entityType: 'album',
        entityId: 'album-2',
        displayTitle: 'With the Beatles',
        position: 2,
        note: 'Updated note.',
        externalSource: 'anontraveler',
        externalId: 'external-item-2',
      }),
    ).rejects.toThrow('Admin permission is required to manage archive items.');
    await expect(deleteArchiveItem('item-1')).rejects.toThrow(
      'Admin permission is required to manage archive items.',
    );
    expect(insertMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('updates an archive item in Supabase', async () => {
    mockSessionWithProfileRole('admin');
    updateEqMock.mockResolvedValue({ error: null });
    const { updateArchiveItem } = await import('./archive.service');

    await updateArchiveItem({
      itemId: 'item-1',
      entityType: 'album',
      entityId: 'album-2',
      displayTitle: 'With the Beatles',
      position: 2,
      note: 'Updated note.',
      externalSource: 'anontraveler',
      externalId: 'external-item-2',
    });

    expect(fromMock).toHaveBeenCalledWith('archive_items');
    expect(updateMock).toHaveBeenCalledWith({
      entity_type: 'album',
      entity_id: 'album-2',
      display_title: 'With the Beatles',
      position: 2,
      note: 'Updated note.',
      external_source: 'anontraveler',
      external_id: 'external-item-2',
    });
    expect(updateEqMock).toHaveBeenCalledWith('id', 'item-1');
  });

  it('deletes an archive item from Supabase', async () => {
    mockSessionWithProfileRole('admin');
    deleteEqMock.mockResolvedValue({ error: null });
    const { deleteArchiveItem } = await import('./archive.service');

    await deleteArchiveItem('item-1');

    expect(fromMock).toHaveBeenCalledWith('archive_items');
    expect(deleteMock).toHaveBeenCalled();
    expect(deleteEqMock).toHaveBeenCalledWith('id', 'item-1');
  });

  it('uses local demo archive collections when Supabase is not configured', async () => {
    vi.stubEnv('VITE_ENABLE_DEMO_MODE', 'true');
    getSupabaseMock.mockImplementation(() => {
      throw new Error('Missing VITE_SUPABASE_URL');
    });
    window.localStorage.setItem('rockroll.demoSession', JSON.stringify({ user: { id: 'local-demo-user' } }));
    const {
      addArchiveItem,
      createArchiveCollection,
      deleteArchiveCollection,
      deleteArchiveItem,
      getArchiveCollectionById,
      listArchiveCollections,
      updateArchiveCollection,
      updateArchiveItem,
    } = await import('./archive.service');

    await createArchiveCollection({
      title: 'Demo guide',
      source: 'manual',
      sourceUrl: '',
      description: 'Local list.',
      collectionType: 'album_rank',
    });
    const collections = await listArchiveCollections();

    expect(collections).toHaveLength(1);
    await updateArchiveCollection(collections[0].id, {
      title: 'Updated demo guide',
      source: 'manual',
      sourceUrl: 'https://example.test/demo',
      description: 'Updated local list.',
      collectionType: 'album_rank',
    });

    await expect(listArchiveCollections()).resolves.toEqual([
      expect.objectContaining({
        id: collections[0].id,
        title: 'Updated demo guide',
        sourceUrl: 'https://example.test/demo',
        description: 'Updated local list.',
      }),
    ]);

    await addArchiveItem({
      collectionId: collections[0].id,
      entityType: 'album',
      entityId: 'local-album-1',
      displayTitle: 'Demo Album',
      position: 1,
      note: 'Local note.',
      externalSource: null,
      externalId: null,
    });

    await expect(getArchiveCollectionById(collections[0].id)).resolves.toEqual(
      expect.objectContaining({
        title: 'Updated demo guide',
        items: [
          expect.objectContaining({
            displayTitle: 'Demo Album',
            entityType: 'album',
            position: 1,
          }),
        ],
      }),
    );

    const detail = await getArchiveCollectionById(collections[0].id);
    const itemId = detail?.items[0].id ?? '';
    await updateArchiveItem({
      itemId,
      entityType: 'album',
      entityId: 'local-album-2',
      displayTitle: 'Updated Demo Album',
      position: 2,
      note: 'Updated local note.',
      externalSource: null,
      externalId: null,
    });

    await expect(getArchiveCollectionById(collections[0].id)).resolves.toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            displayTitle: 'Updated Demo Album',
            entityId: 'local-album-2',
            position: 2,
          }),
        ],
      }),
    );

    await deleteArchiveItem(itemId);

    await expect(getArchiveCollectionById(collections[0].id)).resolves.toEqual(
      expect.objectContaining({
        items: [],
      }),
    );

    await addArchiveItem({
      collectionId: collections[0].id,
      entityType: 'album',
      entityId: 'local-album-3',
      displayTitle: 'Delete Demo Album',
      position: 3,
      note: 'Delete with collection.',
      externalSource: null,
      externalId: null,
    });

    await deleteArchiveCollection(collections[0].id);

    await expect(listArchiveCollections()).resolves.toEqual([]);
    await expect(getArchiveCollectionById(collections[0].id)).resolves.toBeNull();
  });
});
