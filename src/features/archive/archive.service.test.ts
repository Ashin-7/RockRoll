import { beforeEach, describe, expect, it, vi } from 'vitest';

const orderMock = vi.fn();
const maybeSingleMock = vi.fn();
const eqOrderMock = vi.fn(() => ({ order: orderMock }));
const eqMaybeSingleMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const selectMock = vi.fn();
const insertMock = vi.fn();
const getSessionMock = vi.fn();
const fromMock = vi.fn(() => ({ insert: insertMock, select: selectMock }));
const getSupabaseMock = vi.fn(() => ({
  auth: { getSession: getSessionMock },
  from: fromMock,
}));

vi.mock('../../lib/supabase', () => ({
  getSupabase: () => getSupabaseMock(),
}));

describe('archive.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
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
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null });
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

  it('loads a collection detail with ordered items from Supabase', async () => {
    selectMock.mockReturnValueOnce({ eq: eqMaybeSingleMock }).mockReturnValueOnce({ eq: eqOrderMock });
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

  it('adds an album item to an archive collection', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null });
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

  it('uses local demo archive collections when Supabase is not configured', async () => {
    getSupabaseMock.mockImplementation(() => {
      throw new Error('Missing VITE_SUPABASE_URL');
    });
    window.localStorage.setItem('rockroll.demoSession', JSON.stringify({ user: { id: 'local-demo-user' } }));
    const { addArchiveItem, createArchiveCollection, getArchiveCollectionById, listArchiveCollections } = await import(
      './archive.service'
    );

    await createArchiveCollection({
      title: 'Demo guide',
      source: 'manual',
      sourceUrl: '',
      description: 'Local list.',
      collectionType: 'album_rank',
    });
    const collections = await listArchiveCollections();

    expect(collections).toHaveLength(1);
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
        title: 'Demo guide',
        items: [
          expect.objectContaining({
            displayTitle: 'Demo Album',
            entityType: 'album',
            position: 1,
          }),
        ],
      }),
    );
  });
});
