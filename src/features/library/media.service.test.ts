import { beforeEach, describe, expect, it, vi } from 'vitest';

const orderMock = vi.fn();
const singleMock = vi.fn();
const selectAfterInsertMock = vi.fn(() => ({ single: singleMock }));
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

describe('media.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    selectMock.mockImplementation(() => ({ order: orderMock }));
    insertMock.mockResolvedValue({ error: null });
    getSupabaseMock.mockReturnValue({
      auth: { getSession: getSessionMock },
      from: fromMock,
    });
  });

  it('lists media assets with link summaries from Supabase', async () => {
    orderMock.mockResolvedValue({
      data: [
        {
          id: 'media-1',
          file_name: 'solo-take.mp4',
          media_type: 'video',
          storage_bucket: 'practice',
          storage_path: 'takes/solo-take.mp4',
          notes: 'First chorus take.',
          created_at: '2026-07-02T08:00:00.000Z',
          media_links: [
            {
              id: 'link-1',
              entity_type: 'song',
              entity_id: 'song-1',
            },
          ],
        },
      ],
      error: null,
    });
    const { listMediaAssets } = await import('./media.service');

    await expect(listMediaAssets()).resolves.toEqual([
      {
        id: 'media-1',
        fileName: 'solo-take.mp4',
        mediaType: 'video',
        storageBucket: 'practice',
        storagePath: 'takes/solo-take.mp4',
        notes: 'First chorus take.',
        createdAt: '2026-07-02T08:00:00.000Z',
        links: [
          {
            id: 'link-1',
            entityType: 'song',
            entityId: 'song-1',
          },
        ],
      },
    ]);
    expect(fromMock).toHaveBeenCalledWith('media_assets');
    expect(selectMock).toHaveBeenCalledWith(
      'id,file_name,media_type,storage_bucket,storage_path,notes,created_at,media_links(id,entity_type,entity_id)',
    );
    expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('creates a media asset for the current user', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null });
    insertMock.mockReturnValue({ select: selectAfterInsertMock });
    singleMock.mockResolvedValue({ data: { id: 'media-1' }, error: null });
    const { createMediaAsset } = await import('./media.service');

    await createMediaAsset({
      fileName: 'reference.pdf',
      mediaType: 'pdf',
      storageBucket: 'scores',
      storagePath: 'scores/reference.pdf',
      notes: 'Chord reference.',
      link: null,
    });

    expect(fromMock).toHaveBeenCalledWith('media_assets');
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      file_name: 'reference.pdf',
      media_type: 'pdf',
      storage_bucket: 'scores',
      storage_path: 'scores/reference.pdf',
      notes: 'Chord reference.',
    });
    expect(selectAfterInsertMock).toHaveBeenCalledWith('id');
    expect(singleMock).toHaveBeenCalledWith();
  });

  it('creates a media link when an entity is provided', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null });
    insertMock.mockReturnValueOnce({ select: selectAfterInsertMock }).mockResolvedValueOnce({ error: null });
    singleMock.mockResolvedValue({ data: { id: 'media-1' }, error: null });
    const { createMediaAsset } = await import('./media.service');

    await createMediaAsset({
      fileName: 'album-cover.jpg',
      mediaType: 'image',
      storageBucket: 'covers',
      storagePath: 'covers/album-cover.jpg',
      notes: 'Cover reference.',
      link: {
        entityType: 'album',
        entityId: 'album-1',
      },
    });

    expect(fromMock).toHaveBeenCalledWith('media_assets');
    expect(fromMock).toHaveBeenCalledWith('media_links');
    expect(insertMock).toHaveBeenLastCalledWith({
      user_id: 'user-1',
      media_asset_id: 'media-1',
      entity_type: 'album',
      entity_id: 'album-1',
    });
  });

  it('uses local demo media assets when Supabase is not configured', async () => {
    getSupabaseMock.mockImplementation(() => {
      throw new Error('Missing VITE_SUPABASE_URL');
    });
    window.localStorage.setItem('rockroll.demoSession', JSON.stringify({ user: { id: 'local-demo-user' } }));
    const { createMediaAsset, listMediaAssets } = await import('./media.service');

    await createMediaAsset({
      fileName: 'demo-link',
      mediaType: 'link',
      storageBucket: 'external',
      storagePath: 'https://example.test/demo',
      notes: 'External reference.',
      link: {
        entityType: 'artist',
        entityId: 'artist-1',
      },
    });

    await expect(listMediaAssets()).resolves.toEqual([
      expect.objectContaining({
        id: expect.any(String),
        fileName: 'demo-link',
        mediaType: 'link',
        storageBucket: 'external',
        storagePath: 'https://example.test/demo',
        notes: 'External reference.',
        links: [
          expect.objectContaining({
            entityType: 'artist',
            entityId: 'artist-1',
          }),
        ],
      }),
    ]);
  });
});
