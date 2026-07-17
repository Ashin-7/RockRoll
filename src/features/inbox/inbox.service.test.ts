import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUserMock = vi.fn();
const profileSingleMock = vi.fn();
const profileEqMock = vi.fn(() => ({ single: profileSingleMock }));
const profileSelectMock = vi.fn(() => ({ eq: profileEqMock }));
const externalMaybeSingleMock = vi.fn();
const externalInMock = vi.fn();
const externalEq3Mock = vi.fn(() => ({ maybeSingle: externalMaybeSingleMock }));
const externalEq2Mock = vi.fn(() => ({ eq: externalEq3Mock }));
const externalEq1Mock = vi.fn(() => ({ eq: externalEq2Mock, in: externalInMock }));
const externalSelectEqForInMock = vi.fn(() => ({ in: externalInMock }));
const externalSelectMock = vi.fn<() => unknown>(() => ({ eq: externalEq1Mock }));
const externalInsertMock = vi.fn();
const formalSingleMock = vi.fn();
const formalSelectAfterInsertMock = vi.fn(() => ({ single: formalSingleMock }));
const formalInsertMock = vi.fn(() => ({ select: formalSelectAfterInsertMock }));
const formalUpdateEqMock = vi.fn();
const formalUpdateMock = vi.fn(() => ({ eq: formalUpdateEqMock }));
const archiveItemMaybeSingleMock = vi.fn();
const archiveItemEqEntityIdMock = vi.fn(() => ({ maybeSingle: archiveItemMaybeSingleMock }));
const archiveItemEqEntityTypeMock = vi.fn(() => ({ eq: archiveItemEqEntityIdMock }));
const archiveItemEqCollectionMock = vi.fn(() => ({ eq: archiveItemEqEntityTypeMock }));
const archiveItemSelectMock = vi.fn(() => ({ eq: archiveItemEqCollectionMock }));
const singleMock = vi.fn();
const selectInsertMock = vi.fn(() => ({ single: singleMock }));
const jobInsertMock = vi.fn(() => ({ select: selectInsertMock }));
const candidateInsertMock = vi.fn();
const reviewUpsertMock = vi.fn();
const reviewSelectAfterUpsertMock = vi.fn<() => unknown>(() => ({ order: orderMock }));
const reviewUpdateMock = vi.fn();
const reviewSelectAfterUpdateMock = vi.fn();
const reviewEqAfterUpdateMock = vi.fn();
const reviewSingleAfterUpdateMock = vi.fn();
const reviewLookupMaybeSingleMock = vi.fn();
const reviewLookupEqMock = vi.fn(() => ({ maybeSingle: reviewLookupMaybeSingleMock }));
const targetMaybeSingleMock = vi.fn();
const targetVisibilityEqMock = vi.fn(() => ({ maybeSingle: targetMaybeSingleMock }));
const targetIdEqMock = vi.fn(() => ({ eq: targetVisibilityEqMock }));
const targetSelectMock = vi.fn(() => ({ eq: targetIdEqMock }));
const jobSelectMock = vi.fn();
const jobEqMock = vi.fn();
const jobOrderMock = vi.fn();
const jobLimitMock = vi.fn();
const jobDeleteMock = vi.fn();
const jobDeleteInMock = vi.fn();
const candidateSelectMock = vi.fn();
const candidateInMock = vi.fn();
const orderMock = vi.fn();
const selectMock = vi.fn<() => unknown>(() => ({ order: orderMock }));
const reviewRangeMock = vi.fn();
const defaultReviewRangeMock = vi.fn();
const fromMock = vi.fn((tableName: string) => {
  if (tableName === 'profiles') {
    return { select: profileSelectMock };
  }
  if (tableName === 'archive_items') {
    return { insert: formalInsertMock, select: archiveItemSelectMock, update: formalUpdateMock };
  }
  if (tableName === 'artists' || tableName === 'albums' || tableName === 'archive_collections') {
    return { insert: formalInsertMock, select: targetSelectMock };
  }
  if (tableName === 'external_sources') {
    return { select: externalSelectMock, insert: externalInsertMock };
  }
  if (tableName === 'import_jobs') {
    return { delete: jobDeleteMock, insert: jobInsertMock, select: jobSelectMock };
  }
  if (tableName === 'import_review_items') {
    return { select: selectMock, upsert: reviewUpsertMock, update: reviewUpdateMock };
  }
  if (tableName === 'import_candidates') {
    return { select: candidateSelectMock, insert: candidateInsertMock };
  }
  return { select: selectMock, insert: candidateInsertMock };
});
const getSupabaseMock = vi.fn(() => ({
  from: fromMock,
  auth: { getUser: getUserMock },
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

describe('inbox.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    window.localStorage.clear();
    getSupabaseMock.mockReturnValue({
      from: fromMock,
      auth: { getUser: getUserMock },
    });
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    candidateInsertMock.mockResolvedValue({ data: null, error: null });
    candidateSelectMock.mockReturnValue({ order: orderMock });
    candidateInMock.mockResolvedValue({ data: [], error: null });
    jobSelectMock.mockReturnValue({ eq: jobEqMock });
    jobEqMock.mockReturnValue({ order: jobOrderMock });
    jobOrderMock.mockReturnValue({ limit: jobLimitMock });
    jobDeleteMock.mockReturnValue({ in: jobDeleteInMock });
    jobDeleteInMock.mockResolvedValue({ error: null });
    reviewUpsertMock.mockResolvedValue({ error: null });
    reviewSelectAfterUpsertMock.mockReturnValue({ order: orderMock });
    reviewUpdateMock.mockReturnValue({ select: reviewSelectAfterUpdateMock });
    reviewSelectAfterUpdateMock.mockReturnValue({ eq: reviewEqAfterUpdateMock });
    reviewEqAfterUpdateMock.mockReturnValue({ single: reviewSingleAfterUpdateMock });
    reviewLookupEqMock.mockReturnValue({ maybeSingle: reviewLookupMaybeSingleMock });
    reviewLookupMaybeSingleMock.mockResolvedValue({ data: { entity_type: 'artist' }, error: null });
    targetSelectMock.mockReturnValue({ eq: targetIdEqMock });
    targetIdEqMock.mockReturnValue({ eq: targetVisibilityEqMock });
    targetVisibilityEqMock.mockReturnValue({ maybeSingle: targetMaybeSingleMock });
    targetMaybeSingleMock.mockResolvedValue({ data: { id: 'artist-existing-1' }, error: null });
    selectMock.mockReturnValue({ order: orderMock, range: defaultReviewRangeMock });
    defaultReviewRangeMock.mockImplementation((from: number) => (from === 0 ? orderMock() : { data: [], error: null }));
    profileSingleMock.mockResolvedValue({ data: { role: 'admin' }, error: null });
    externalMaybeSingleMock.mockResolvedValue({ data: null, error: null });
    externalSelectMock.mockReturnValue({ eq: externalEq1Mock });
    externalInMock.mockResolvedValue({ data: [], error: null });
    externalInsertMock.mockResolvedValue({ error: null });
    formalUpdateEqMock.mockResolvedValue({ error: null });
    archiveItemMaybeSingleMock.mockResolvedValue({ data: null, error: null });
    formalSingleMock
      .mockResolvedValueOnce({ data: { id: 'artist-created-1' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'album-created-1' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'collection-created-1' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'archive-item-created-1' }, error: null });
  });

  it('lists import candidates from Supabase', async () => {
    orderMock.mockResolvedValue({
      data: [
        {
          id: 'candidate-1',
          entity_type: 'artist',
          display_title: 'The Jimi Hendrix Experience',
          display_subtitle: 'US - American-English rock band',
          source_name: 'musicbrainz',
        },
      ],
      error: null,
    });
    const { listImportCandidates } = await import('./inbox.service');

    await expect(listImportCandidates()).resolves.toEqual([
      {
        id: 'candidate-1',
        entityType: 'artist',
        displayTitle: 'The Jimi Hendrix Experience',
        displaySubtitle: 'US - American-English rock band',
        sourceName: 'musicbrainz',
      },
    ]);
    expect(fromMock).toHaveBeenCalledWith('import_candidates');
    expect(candidateSelectMock).toHaveBeenCalledWith('id,entity_type,display_title,display_subtitle,source_name');
    expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('rejects listing import candidates for non-admin users', async () => {
    profileSingleMock.mockResolvedValue({ data: { role: 'user' }, error: null });
    const { listImportCandidates } = await import('./inbox.service');

    await expect(listImportCandidates()).rejects.toThrow('Only admins can view import candidates.');
    expect(candidateSelectMock).not.toHaveBeenCalled();
  });

  it('uses local demo import candidates when Supabase is not configured', async () => {
    vi.stubEnv('VITE_ENABLE_DEMO_MODE', 'true');
    getSupabaseMock.mockImplementation(() => {
      throw new Error('Missing VITE_SUPABASE_URL');
    });
    window.localStorage.setItem(
      'rockroll.demoImportCandidates',
      JSON.stringify([
        {
          id: 'candidate-1',
          entityType: 'artist',
          displayTitle: 'Demo Artist',
          displaySubtitle: 'Local candidate',
          sourceName: 'musicbrainz',
        },
      ]),
    );
    const { listImportCandidates } = await import('./inbox.service');

    await expect(listImportCandidates()).resolves.toEqual([
      {
        id: 'candidate-1',
        entityType: 'artist',
        displayTitle: 'Demo Artist',
        displaySubtitle: 'Local candidate',
        sourceName: 'musicbrainz',
      },
    ]);
  });

  it('lists recent Anontraveler import draft jobs with candidate counts', async () => {
    jobLimitMock.mockResolvedValue({
      data: [
        {
          id: 'job-1',
          source_name: 'anontraveler',
          query: 'https://www.anontraveler.com/rank/version/version-1',
          completed_at: '2026-07-06T01:00:00.000Z',
        },
        {
          id: 'job-2',
          source_name: 'anontraveler',
          query: 'https://www.anontraveler.com/rank/version/version-2',
          completed_at: null,
        },
      ],
      error: null,
    });
    candidateSelectMock.mockReturnValue({ in: candidateInMock });
    candidateInMock.mockResolvedValue({
      data: [{ import_job_id: 'job-1' }, { import_job_id: 'job-1' }, { import_job_id: 'job-2' }],
      error: null,
    });
    const { listImportDraftJobs } = await import('./inbox.service');

    await expect(listImportDraftJobs()).resolves.toEqual([
      {
        id: 'job-1',
        sourceName: 'anontraveler',
        query: 'https://www.anontraveler.com/rank/version/version-1',
        completedAt: '2026-07-06T01:00:00.000Z',
        candidateCount: 2,
      },
      {
        id: 'job-2',
        sourceName: 'anontraveler',
        query: 'https://www.anontraveler.com/rank/version/version-2',
        completedAt: null,
        candidateCount: 1,
      },
    ]);
    expect(fromMock).toHaveBeenCalledWith('import_jobs');
    expect(jobSelectMock).toHaveBeenCalledWith('id,source_name,query,completed_at');
    expect(jobEqMock).toHaveBeenCalledWith('source_name', 'anontraveler');
    expect(jobOrderMock).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(jobLimitMock).toHaveBeenCalledWith(10);
    expect(candidateSelectMock).toHaveBeenCalledWith('import_job_id');
    expect(candidateInMock).toHaveBeenCalledWith('import_job_id', ['job-1', 'job-2']);
  });

  it('rejects listing import draft jobs for non-admin users', async () => {
    profileSingleMock.mockResolvedValue({ data: { role: 'user' }, error: null });
    const { listImportDraftJobs } = await import('./inbox.service');

    await expect(listImportDraftJobs()).rejects.toThrow('Only admins can view import draft jobs.');
    expect(jobSelectMock).not.toHaveBeenCalled();
  });

  it('deletes an import draft job so its candidate index rows cascade away', async () => {
    const { deleteImportDraftJob } = await import('./inbox.service');

    await expect(deleteImportDraftJob('job-1')).resolves.toEqual({ importJobId: 'job-1' });

    expect(getUserMock).toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalledWith('profiles');
    expect(fromMock).toHaveBeenCalledWith('import_jobs');
    expect(jobDeleteMock).toHaveBeenCalledWith();
    expect(jobDeleteInMock).toHaveBeenCalledWith('id', ['job-1']);
  });

  it('rejects deleting import draft jobs for non-admin users', async () => {
    profileSingleMock.mockResolvedValue({ data: { role: 'user' }, error: null });
    const { deleteImportDraftJob } = await import('./inbox.service');

    await expect(deleteImportDraftJob('job-1')).rejects.toThrow('Only admins can delete import draft jobs.');
    expect(jobDeleteMock).not.toHaveBeenCalled();
  });

  it('saves Anontraveler preview candidates to a user-bound import job draft', async () => {
    singleMock.mockResolvedValue({ data: { id: 'job-1' }, error: null });
    const { saveImportCandidatesDraft } = await import('./inbox.service');

    await expect(
      saveImportCandidatesDraft({
        sourceName: 'anontraveler',
        query: 'https://www.anontraveler.com/rank/version/version-1',
        candidates: [
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
            },
          },
        ],
      }),
    ).resolves.toEqual({ importJobId: 'job-1', savedCount: 2 });

    expect(getUserMock).toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalledWith('profiles');
    expect(fromMock).toHaveBeenCalledWith('import_jobs');
    expect(jobInsertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      query: 'https://www.anontraveler.com/rank/version/version-1',
      source_name: 'anontraveler',
      status: 'completed',
      completed_at: expect.any(String),
    });
    expect(selectInsertMock).toHaveBeenCalledWith('id');
    expect(singleMock).toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalledWith('import_candidates');
    expect(candidateInsertMock).toHaveBeenCalledWith([
      {
        user_id: 'user-1',
        import_job_id: 'job-1',
        entity_type: 'artist',
        display_title: 'The Beatles',
        display_subtitle: 'Anontraveler artist candidate',
        source_name: 'anontraveler',
        source_id: 'artist-1',
        source_url: 'https://www.anontraveler.com/rank/version/version-1',
        raw_payload: {
          candidateId: 'anontraveler:artist:artist-1',
          sourceName: 'anontraveler',
          metadata: undefined,
        },
      },
      {
        user_id: 'user-1',
        import_job_id: 'job-1',
        entity_type: 'album',
        display_title: 'Please Please Me',
        display_subtitle: 'The Beatles - 1963',
        source_name: 'anontraveler',
        source_id: 'album-1',
        source_url: 'https://www.anontraveler.com/rank/version/version-1',
        raw_payload: {
          candidateId: 'anontraveler:album:album-1',
          sourceName: 'anontraveler',
          metadata: {
            artistName: 'The Beatles',
            releaseYear: 1963,
            coverUrl: 'https://img.example.test/please-please-me.jpg',
            styles: ['节拍音乐', '摇滚'],
            albumType: '专辑',
            note: 'Beat music marker.',
          },
        },
      },
    ]);
  });

  it('saves large import candidate drafts in batches to avoid oversized PostgREST requests', async () => {
    singleMock.mockResolvedValue({ data: { id: 'job-1' }, error: null });
    const candidates = Array.from({ length: 401 }, (_, index) => ({
      id: `anontraveler:album:album-${index + 1}`,
      entityType: 'album' as const,
      displayTitle: `Album ${index + 1}`,
      displaySubtitle: 'Artist',
      sourceName: 'anontraveler' as const,
    }));
    const { saveImportCandidatesDraft } = await import('./inbox.service');

    await expect(
      saveImportCandidatesDraft({
        sourceName: 'anontraveler',
        query: 'https://www.anontraveler.com/rank/version/large',
        candidates,
      }),
    ).resolves.toEqual({ importJobId: 'job-1', savedCount: 401 });

    expect(candidateInsertMock).toHaveBeenCalledTimes(3);
    expect(candidateInsertMock.mock.calls[0][0]).toHaveLength(200);
    expect(candidateInsertMock.mock.calls[1][0]).toHaveLength(200);
    expect(candidateInsertMock.mock.calls[2][0]).toHaveLength(1);
  });

  it('rejects saving import candidate drafts without an authenticated user', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });
    const { saveImportCandidatesDraft } = await import('./inbox.service');

    await expect(
      saveImportCandidatesDraft({
        sourceName: 'anontraveler',
        query: 'https://www.anontraveler.com/rank/version/version-1',
        candidates: [],
      }),
    ).rejects.toThrow('You must sign in before saving import candidates.');
  });

  it('rejects saving import candidate drafts for non-admin users', async () => {
    profileSingleMock.mockResolvedValue({ data: { role: 'user' }, error: null });
    const { saveImportCandidatesDraft } = await import('./inbox.service');

    await expect(
      saveImportCandidatesDraft({
        sourceName: 'anontraveler',
        query: 'https://www.anontraveler.com/rank/version/version-1',
        candidates: [],
      }),
    ).rejects.toThrow('Only admins can save import candidates.');
  });

  it('generates a user-bound review plan without writing formal library records', async () => {
    const { createImportReviewPlan } = await import('./inbox.service');

    await expect(
      createImportReviewPlan({
        importJobId: 'job-1',
        sourceName: 'anontraveler',
        sourceUrl: 'https://www.anontraveler.com/rank/version/version-1',
        candidates: [
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
            },
          },
        ],
        archiveCollection: {
          externalId: 'version-1',
          title: 'Classic rock guide',
          description: 'Albums to explore.',
          collectionType: 'album_rank',
        },
        archiveItems: [
          {
            externalId: 'item-1',
            albumExternalId: 'album-1',
            displayTitle: 'Please Please Me',
            position: 1,
            note: 'Beat music marker.',
          },
        ],
      }),
    ).resolves.toEqual({
      plannedCount: 4,
      plannedCounts: {
        artist: 1,
        album: 1,
        archive_collection: 1,
        archive_item: 1,
        song: 0,
        media_asset: 0,
      },
      items: [],
    });

    expect(fromMock).toHaveBeenCalledWith('import_review_items');
    expect(reviewUpsertMock).toHaveBeenCalledWith(
      [
        {
          user_id: 'user-1',
          import_job_id: 'job-1',
          import_candidate_id: null,
          entity_type: 'artist',
          source_name: 'anontraveler',
          source_id: 'artist-1',
          source_url: 'https://www.anontraveler.com/rank/version/version-1',
          display_title: 'The Beatles',
          planned_action: 'create',
          review_payload: {
            candidateId: 'anontraveler:artist:artist-1',
            displaySubtitle: 'Anontraveler artist candidate',
            metadata: undefined,
          },
        },
        {
          user_id: 'user-1',
          import_job_id: 'job-1',
          import_candidate_id: null,
          entity_type: 'album',
          source_name: 'anontraveler',
          source_id: 'album-1',
          source_url: 'https://www.anontraveler.com/rank/version/version-1',
          display_title: 'Please Please Me',
          planned_action: 'create',
          review_payload: {
            candidateId: 'anontraveler:album:album-1',
            displaySubtitle: 'The Beatles - 1963',
            metadata: {
              artistName: 'The Beatles',
              releaseYear: 1963,
              coverUrl: 'https://img.example.test/please-please-me.jpg',
              styles: ['节拍音乐', '摇滚'],
              albumType: '专辑',
              note: 'Beat music marker.',
            },
          },
        },
        {
          user_id: 'user-1',
          import_job_id: 'job-1',
          import_candidate_id: null,
          entity_type: 'archive_collection',
          source_name: 'anontraveler',
          source_id: 'version-1',
          source_url: 'https://www.anontraveler.com/rank/version/version-1',
          display_title: 'Classic rock guide',
          planned_action: 'create',
          review_payload: {
            collectionType: 'album_rank',
            description: 'Albums to explore.',
          },
        },
        {
          user_id: 'user-1',
          import_job_id: 'job-1',
          import_candidate_id: null,
          entity_type: 'archive_item',
          source_name: 'anontraveler',
          source_id: 'item-1',
          source_url: 'https://www.anontraveler.com/rank/version/version-1',
          display_title: 'Please Please Me',
          planned_action: 'create',
          review_payload: {
            albumExternalId: 'album-1',
            note: 'Beat music marker.',
            position: 1,
          },
        },
      ],
      { onConflict: 'user_id,source_name,source_id,entity_type' },
    );
    expect(reviewSelectAfterUpsertMock).not.toHaveBeenCalled();
    expect(orderMock).not.toHaveBeenCalledWith('created_at', { ascending: true });
  });

  it('generates large review plans in batches without selecting every inserted row', async () => {
    const candidates = Array.from({ length: 401 }, (_, index) => ({
      id: `anontraveler:album:album-${index + 1}`,
      entityType: 'album' as const,
      displayTitle: `Album ${index + 1}`,
      displaySubtitle: 'Artist',
      sourceName: 'anontraveler' as const,
    }));
    const archiveItems = Array.from({ length: 401 }, (_, index) => ({
      externalId: `version-1:item:${index + 1}:album-${index + 1}`,
      albumExternalId: `album-${index + 1}`,
      displayTitle: `Album ${index + 1}`,
      position: index + 1,
      note: '',
    }));
    const { createImportReviewPlan } = await import('./inbox.service');

    await expect(
      createImportReviewPlan({
        importJobId: 'job-1',
        sourceName: 'anontraveler',
        sourceUrl: 'https://www.anontraveler.com/rank/version/large',
        candidates,
        archiveCollection: {
          externalId: 'version-1',
          title: 'Large guide',
          description: '',
          collectionType: 'album_rank',
        },
        archiveItems,
      }),
    ).resolves.toEqual({
      plannedCount: 803,
      plannedCounts: {
        artist: 0,
        album: 401,
        archive_collection: 1,
        archive_item: 401,
        song: 0,
        media_asset: 0,
      },
      items: [],
    });

    expect(reviewUpsertMock).toHaveBeenCalledTimes(5);
    expect(reviewUpsertMock.mock.calls[0][0]).toHaveLength(200);
    expect(reviewUpsertMock.mock.calls[1][0]).toHaveLength(200);
    expect(reviewUpsertMock.mock.calls[2][0]).toHaveLength(200);
    expect(reviewUpsertMock.mock.calls[3][0]).toHaveLength(200);
    expect(reviewUpsertMock.mock.calls[4][0]).toHaveLength(3);
    expect(reviewSelectAfterUpsertMock).not.toHaveBeenCalled();
  });

  it('runs review plan write batches with limited concurrency instead of serial requests', async () => {
    const candidates = Array.from({ length: 601 }, (_, index) => ({
      id: `anontraveler:album:album-${index + 1}`,
      entityType: 'album' as const,
      displayTitle: `Album ${index + 1}`,
      displaySubtitle: 'Artist',
      sourceName: 'anontraveler' as const,
    }));
    const requests = Array.from({ length: 4 }, () => createTrackedDeferred<{ error: null }>());
    reviewUpsertMock.mockImplementation(() => requests[reviewUpsertMock.mock.calls.length - 1].promise);
    const { createImportReviewPlan } = await import('./inbox.service');

    const resultPromise = createImportReviewPlan({
      importJobId: 'job-1',
      sourceName: 'anontraveler',
      sourceUrl: 'https://www.anontraveler.com/rank/version/large',
      candidates,
    });

    await flushMicrotasks();
    expect(reviewUpsertMock).toHaveBeenCalledTimes(3);
    expect(requests[0].isResolved).toBe(false);

    requests[0].resolve({ error: null });
    await flushMicrotasks();
    expect(reviewUpsertMock).toHaveBeenCalledTimes(4);

    requests[1].resolve({ error: null });
    requests[2].resolve({ error: null });
    requests[3].resolve({ error: null });

    await expect(resultPromise).resolves.toEqual({
      plannedCount: 601,
      plannedCounts: {
        artist: 0,
        album: 601,
        archive_collection: 0,
        archive_item: 0,
        song: 0,
        media_asset: 0,
      },
      items: [],
    });
  });

  it('reads the current user import role from profiles', async () => {
    const { getCurrentUserImportRole } = await import('./inbox.service');

    await expect(getCurrentUserImportRole()).resolves.toBe('admin');

    expect(fromMock).toHaveBeenCalledWith('profiles');
    expect(profileSelectMock).toHaveBeenCalledWith('role');
    expect(profileEqMock).toHaveBeenCalledWith('id', 'user-1');
    expect(profileSingleMock).toHaveBeenCalledWith();
  });

  it('treats missing session as anonymous import role', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });
    const { getCurrentUserImportRole } = await import('./inbox.service');

    await expect(getCurrentUserImportRole()).resolves.toBe('anonymous');
    expect(fromMock).not.toHaveBeenCalledWith('profiles');
  });

  it('rejects listing import review items for non-admin users', async () => {
    profileSingleMock.mockResolvedValue({ data: { role: 'user' }, error: null });
    const { listImportReviewItems } = await import('./inbox.service');

    await expect(listImportReviewItems()).rejects.toThrow('Only admins can view import review items.');
    expect(selectMock).not.toHaveBeenCalled();
  });

  it('maps album source metadata when listing import review items', async () => {
    selectMock.mockResolvedValue({
      data: [
        {
          id: 'review-album-1',
          entity_type: 'album',
          display_title: 'Album one',
          source_name: 'anontraveler',
          source_id: 'album-1',
          planned_action: 'create',
          target_entity_id: null,
          skip_reason: '',
          error_message: null,
          review_payload: {
            metadata: {
              artistName: 'Artist one',
              releaseYear: 2001,
              coverUrl: 'https://img.example.test/review-album-one.jpg',
              styles: ['Rock', 'Psychedelic'],
              note: 'Review source note.',
            },
          },
        },
      ],
      error: null,
    });
    const { listImportReviewItems } = await import('./inbox.service');

    await expect(listImportReviewItems()).resolves.toEqual([
      {
        id: 'review-album-1',
        entityType: 'album',
        displayTitle: 'Album one',
        sourceName: 'anontraveler',
        sourceId: 'album-1',
        plannedAction: 'create',
        targetEntityId: null,
        skipReason: '',
        errorMessage: null,
        metadata: {
          artistName: 'Artist one',
          releaseYear: 2001,
          coverUrl: 'https://img.example.test/review-album-one.jpg',
          styles: ['Rock', 'Psychedelic'],
          note: 'Review source note.',
        },
      },
    ]);
  });

  it('commits create review items into public formal library records as an admin', async () => {
    selectMock.mockResolvedValue({
      data: [
        {
          id: 'review-artist-1',
          import_job_id: 'job-1',
          entity_type: 'artist',
          display_title: 'The Beatles',
          source_name: 'anontraveler',
          source_id: 'artist-1',
          source_url: 'https://www.anontraveler.com/rank/version/version-1',
          planned_action: 'create',
          target_entity_id: null,
          skip_reason: '',
          error_message: null,
          review_payload: {},
        },
        {
          id: 'review-album-1',
          import_job_id: 'job-1',
          entity_type: 'album',
          display_title: 'Please Please Me',
          source_name: 'anontraveler',
          source_id: 'album-1',
          source_url: 'https://www.anontraveler.com/rank/version/version-1',
          planned_action: 'create',
          target_entity_id: null,
          skip_reason: '',
          error_message: null,
          review_payload: {
            metadata: {
              artistName: 'The Beatles',
              releaseYear: 1963,
              coverUrl: '  https://img.example.test/please-please-me.jpg  ',
              styles: [' Beat music ', '', 'Beat music', 'Rock'],
              albumType: 'studio album',
              note: 'Beat music marker.',
            },
          },
        },
        {
          id: 'review-collection-1',
          import_job_id: 'job-1',
          entity_type: 'archive_collection',
          display_title: 'Classic rock guide',
          source_name: 'anontraveler',
          source_id: 'version-1',
          source_url: 'https://www.anontraveler.com/rank/version/version-1',
          planned_action: 'create',
          target_entity_id: null,
          skip_reason: '',
          error_message: null,
          review_payload: { collectionType: 'album_rank', description: 'Albums to explore.' },
        },
        {
          id: 'review-item-1',
          import_job_id: 'job-1',
          entity_type: 'archive_item',
          display_title: 'Please Please Me',
          source_name: 'anontraveler',
          source_id: 'item-1',
          source_url: 'https://www.anontraveler.com/rank/version/version-1',
          planned_action: 'create',
          target_entity_id: null,
          skip_reason: '',
          error_message: null,
          review_payload: { albumExternalId: 'album-1', position: 1, note: 'Beat music marker.' },
        },
        {
          id: 'review-skip-1',
          import_job_id: 'job-1',
          entity_type: 'artist',
          display_title: 'Skipped Artist',
          source_name: 'anontraveler',
          source_id: 'artist-skip',
          source_url: 'https://www.anontraveler.com/rank/version/version-1',
          planned_action: 'skip',
          target_entity_id: null,
          skip_reason: 'No need',
          error_message: null,
          review_payload: {},
        },
      ],
      error: null,
    });
    const { commitPublicImportReviewPlan } = await import('./inbox.service');

    await expect(commitPublicImportReviewPlan()).resolves.toEqual({
      createdCount: 4,
      matchedCount: 0,
      skippedCount: 1,
    });

    expect(formalInsertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      name: 'The Beatles',
      notes: '',
      visibility: 'public',
    });
    expect(formalInsertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      artist_id: 'artist-created-1',
      title: 'Please Please Me',
      release_year: 1963,
      cover_url: 'https://img.example.test/please-please-me.jpg',
      styles: ['Beat music', 'Rock'],
      album_type: 'album',
      notes: 'Beat music marker.',
      visibility: 'public',
    });
    expect(formalInsertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      title: 'Classic rock guide',
      source: 'anontraveler',
      source_url: 'https://www.anontraveler.com/rank/version/version-1',
      description: 'Albums to explore.',
      collection_type: 'album_rank',
      visibility: 'public',
    });
    expect(formalInsertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      collection_id: 'collection-created-1',
      entity_type: 'album',
      entity_id: 'album-created-1',
      display_title: 'Please Please Me',
      position: 1,
      note: 'Beat music marker.',
      external_source: 'anontraveler',
      external_id: 'item-1',
      visibility: 'public',
    });
    expect(externalInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        source_name: 'anontraveler',
        visibility: 'public',
      }),
    );
    expect(jobDeleteMock).toHaveBeenCalledWith();
    expect(jobDeleteInMock).toHaveBeenCalledWith('id', ['job-1']);
  });

  it('keeps existing album formal metadata unchanged when committing a manual match', async () => {
    selectMock.mockResolvedValue({
      data: [
        {
          id: 'review-album-1',
          import_job_id: 'job-1',
          entity_type: 'album',
          display_title: 'Please Please Me',
          source_name: 'anontraveler',
          source_id: 'album-1',
          source_url: 'https://www.anontraveler.com/rank/version/version-1',
          planned_action: 'match_existing',
          target_entity_id: 'album-existing-1',
          skip_reason: '',
          error_message: null,
          review_payload: {
            metadata: {
              coverUrl: 'https://img.example.test/incoming.jpg',
              styles: ['Incoming style'],
            },
          },
        },
      ],
      error: null,
    });
    const { commitPublicImportReviewPlan } = await import('./inbox.service');

    await expect(commitPublicImportReviewPlan()).resolves.toEqual({
      createdCount: 0,
      matchedCount: 1,
      skippedCount: 0,
    });

    expect(formalInsertMock).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Please Please Me' }));
    expect(formalUpdateMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ cover_url: expect.anything() }),
    );
    expect(formalUpdateMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ styles: expect.anything() }),
    );
  });

  it('commits albums with their own imported artist instead of the first artist in the plan', async () => {
    formalSingleMock
      .mockReset()
      .mockResolvedValueOnce({ data: { id: 'artist-created-1' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'artist-created-2' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'album-created-1' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'album-created-2' }, error: null });
    selectMock.mockResolvedValue({
      data: [
        {
          id: 'review-artist-1',
          entity_type: 'artist',
          display_title: 'The Beatles',
          source_name: 'anontraveler',
          source_id: 'artist-1',
          source_url: 'https://www.anontraveler.com/rank/version/version-1',
          planned_action: 'create',
          target_entity_id: null,
          skip_reason: '',
          error_message: null,
          review_payload: {},
        },
        {
          id: 'review-artist-2',
          entity_type: 'artist',
          display_title: '13th Floor Elevators',
          source_name: 'anontraveler',
          source_id: 'artist-2',
          source_url: 'https://www.anontraveler.com/rank/version/version-1',
          planned_action: 'create',
          target_entity_id: null,
          skip_reason: '',
          error_message: null,
          review_payload: {},
        },
        {
          id: 'review-album-1',
          entity_type: 'album',
          display_title: 'Please Please Me',
          source_name: 'anontraveler',
          source_id: 'album-1',
          source_url: 'https://www.anontraveler.com/rank/version/version-1',
          planned_action: 'create',
          target_entity_id: null,
          skip_reason: '',
          error_message: null,
          review_payload: { metadata: { artistName: 'The Beatles', sourceRank: 1 } },
        },
        {
          id: 'review-album-2',
          entity_type: 'album',
          display_title: 'The Psychedelic Sounds of the 13th Floor Elevators',
          source_name: 'anontraveler',
          source_id: 'album-2',
          source_url: 'https://www.anontraveler.com/rank/version/version-1',
          planned_action: 'create',
          target_entity_id: null,
          skip_reason: '',
          error_message: null,
          review_payload: { metadata: { artistName: '13th Floor Elevators', sourceRank: 2 } },
        },
      ],
      error: null,
    });
    const { commitPublicImportReviewPlan } = await import('./inbox.service');

    await expect(commitPublicImportReviewPlan()).resolves.toEqual({
      createdCount: 4,
      matchedCount: 0,
      skippedCount: 0,
    });

    expect(formalInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Please Please Me',
        artist_id: 'artist-created-2',
      }),
    );
    expect(formalInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'The Psychedelic Sounds of the 13th Floor Elevators',
        artist_id: 'artist-created-1',
      }),
    );
  });

  it('rejects public import commits from non-admin users', async () => {
    profileSingleMock.mockResolvedValue({ data: { role: 'user' }, error: null });
    const { commitPublicImportReviewPlan } = await import('./inbox.service');

    await expect(commitPublicImportReviewPlan()).rejects.toThrow('Only admins can commit public imports.');
  });

  it('loads every review item page before committing a large public import plan', async () => {
    const skippedRows = Array.from({ length: 1001 }, (_, index) => ({
      id: `review-skip-${index + 1}`,
      import_job_id: 'job-1',
      entity_type: 'album',
      display_title: `Skipped album ${index + 1}`,
      source_name: 'anontraveler',
      source_id: `album-${index + 1}`,
      source_url: 'https://www.anontraveler.com/rank/version/large',
      planned_action: 'skip',
      target_entity_id: null,
      skip_reason: 'Only testing pagination',
      error_message: null,
      review_payload: {},
    }));
    selectMock.mockReturnValue({ range: reviewRangeMock });
    reviewRangeMock
      .mockResolvedValueOnce({ data: skippedRows.slice(0, 1000), error: null })
      .mockResolvedValueOnce({ data: skippedRows.slice(1000), error: null });
    const { commitPublicImportReviewPlan } = await import('./inbox.service');

    await expect(commitPublicImportReviewPlan()).resolves.toEqual({
      createdCount: 0,
      matchedCount: 0,
      skippedCount: 1001,
    });

    expect(reviewRangeMock).toHaveBeenNthCalledWith(1, 0, 999);
    expect(reviewRangeMock).toHaveBeenNthCalledWith(2, 1000, 1999);
  });

  it('prefetches existing public external sources by entity type before committing imports', async () => {
    selectMock.mockResolvedValue({
      data: [
        {
          id: 'review-artist-1',
          entity_type: 'artist',
          display_title: 'The Beatles',
          source_name: 'anontraveler',
          source_id: 'artist-1',
          source_url: 'https://www.anontraveler.com/rank/version/version-1',
          planned_action: 'create',
          target_entity_id: null,
          skip_reason: '',
          error_message: null,
          review_payload: {},
        },
        {
          id: 'review-album-1',
          entity_type: 'album',
          display_title: 'Please Please Me',
          source_name: 'anontraveler',
          source_id: 'album-1',
          source_url: 'https://www.anontraveler.com/rank/version/version-1',
          planned_action: 'create',
          target_entity_id: null,
          skip_reason: '',
          error_message: null,
          review_payload: { metadata: { artistName: 'The Beatles' } },
        },
      ],
      error: null,
    });
    externalSelectMock.mockImplementationOnce(() => ({ eq: externalSelectEqForInMock }));
    externalInMock.mockResolvedValue({
      data: [{ source_id: 'artist-1', entity_id: 'artist-existing-1', entity_type: 'artist' }],
      error: null,
    });
    const { commitPublicImportReviewPlan } = await import('./inbox.service');

    await expect(commitPublicImportReviewPlan()).resolves.toEqual({
      createdCount: 1,
      matchedCount: 1,
      skippedCount: 0,
    });

    expect(externalSelectMock).toHaveBeenCalledWith('source_id,entity_id,entity_type');
    expect(externalSelectEqForInMock).toHaveBeenCalledWith('source_name', 'anontraveler');
    expect(externalInMock).toHaveBeenCalledWith('source_id', ['artist-1']);
    expect(externalMaybeSingleMock).not.toHaveBeenCalled();
    expect(formalInsertMock).not.toHaveBeenCalledWith(expect.objectContaining({ name: 'The Beatles' }));
    expect(formalInsertMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Please Please Me' }));
  });

  it('prefetches existing public external sources in chunks to avoid oversized in filters', async () => {
    const artistRows = Array.from({ length: 401 }, (_, index) => ({
      id: `review-artist-${index + 1}`,
      import_job_id: 'job-1',
      entity_type: 'artist',
      display_title: `Artist ${index + 1}`,
      source_name: 'anontraveler',
      source_id: `artist-${index + 1}`,
      source_url: 'https://www.anontraveler.com/rank/version/large',
      planned_action: 'create',
      target_entity_id: null,
      skip_reason: '',
      error_message: null,
      review_payload: {},
    }));
    selectMock.mockResolvedValue({ data: artistRows, error: null });
    externalInMock
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null });
    formalSingleMock.mockImplementation(async () => ({ data: { id: `created-${formalSingleMock.mock.calls.length}` }, error: null }));
    const { commitPublicImportReviewPlan } = await import('./inbox.service');

    await expect(commitPublicImportReviewPlan()).resolves.toEqual({
      createdCount: 401,
      matchedCount: 0,
      skippedCount: 0,
    });

    expect(externalInMock).toHaveBeenCalledTimes(3);
    expect(externalInMock.mock.calls[0][1]).toHaveLength(200);
    expect(externalInMock.mock.calls[1][1]).toHaveLength(200);
    expect(externalInMock.mock.calls[2][1]).toHaveLength(1);
  });

  it('backfills notes for already imported archive items when committing a refreshed plan', async () => {
    selectMock.mockResolvedValue({
      data: [
        {
          id: 'review-album-1',
          import_job_id: 'job-1',
          entity_type: 'album',
          display_title: 'Please Please Me',
          source_name: 'anontraveler',
          source_id: 'album-1',
          source_url: 'https://www.anontraveler.com/rank/version/version-1',
          planned_action: 'create',
          target_entity_id: null,
          skip_reason: '',
          error_message: null,
          review_payload: { metadata: { artistName: 'The Beatles' } },
        },
        {
          id: 'review-item-1',
          import_job_id: 'job-1',
          entity_type: 'archive_item',
          display_title: 'Please Please Me',
          source_name: 'anontraveler',
          source_id: 'item-1',
          source_url: 'https://www.anontraveler.com/rank/version/version-1',
          planned_action: 'create',
          target_entity_id: null,
          skip_reason: '',
          error_message: null,
          review_payload: { albumExternalId: 'album-1', position: 1, note: 'Imported comment.' },
        },
      ],
      error: null,
    });
    externalInMock
      .mockResolvedValueOnce({
        data: [{ source_id: 'album-1', entity_id: 'album-existing-1', entity_type: 'album' }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ source_id: 'item-1', entity_id: 'archive-item-existing-1', entity_type: 'archive_item' }],
        error: null,
      });
    const { commitPublicImportReviewPlan } = await import('./inbox.service');

    await expect(commitPublicImportReviewPlan()).resolves.toEqual({
      createdCount: 0,
      matchedCount: 2,
      skippedCount: 0,
    });

    expect(formalUpdateMock).toHaveBeenCalledWith({ note: 'Imported comment.' });
    expect(formalUpdateEqMock).toHaveBeenCalledWith('id', 'archive-item-existing-1');
    expect(formalUpdateMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ cover_url: expect.anything() }),
    );
    expect(formalUpdateMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ styles: expect.anything() }),
    );
    expect(formalInsertMock).not.toHaveBeenCalledWith(expect.objectContaining({ external_id: 'item-1' }));
  });

  it('reuses an archive item in the same collection when a refreshed source id would hit the collection album uniqueness constraint', async () => {
    selectMock.mockResolvedValue({
      data: [
        {
          id: 'review-collection-1',
          import_job_id: 'job-1',
          entity_type: 'archive_collection',
          display_title: 'Classic rock guide',
          source_name: 'anontraveler',
          source_id: 'version-1',
          source_url: 'https://www.anontraveler.com/rank/version/version-1',
          planned_action: 'create',
          target_entity_id: null,
          skip_reason: '',
          error_message: null,
          review_payload: { collectionType: 'album_rank', description: 'Albums to explore.' },
        },
        {
          id: 'review-album-1',
          import_job_id: 'job-1',
          entity_type: 'album',
          display_title: 'Please Please Me',
          source_name: 'anontraveler',
          source_id: 'album-1',
          source_url: 'https://www.anontraveler.com/rank/version/version-1',
          planned_action: 'create',
          target_entity_id: null,
          skip_reason: '',
          error_message: null,
          review_payload: { metadata: { artistName: 'The Beatles' } },
        },
        {
          id: 'review-item-1',
          import_job_id: 'job-1',
          entity_type: 'archive_item',
          display_title: 'Please Please Me',
          source_name: 'anontraveler',
          source_id: 'version-1:item:item-1:album-1',
          source_url: 'https://www.anontraveler.com/rank/version/version-1',
          planned_action: 'create',
          target_entity_id: null,
          skip_reason: '',
          error_message: null,
          review_payload: { albumExternalId: 'album-1', position: 1, note: 'Imported comment.' },
        },
      ],
      error: null,
    });
    externalInMock
      .mockResolvedValueOnce({
        data: [{ source_id: 'album-1', entity_id: 'album-existing-1', entity_type: 'album' }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ source_id: 'version-1', entity_id: 'collection-existing-1', entity_type: 'archive_collection' }],
        error: null,
      })
      .mockResolvedValueOnce({ data: [], error: null });
    archiveItemMaybeSingleMock.mockResolvedValue({
      data: { id: 'archive-item-existing-1' },
      error: null,
    });
    const { commitPublicImportReviewPlan } = await import('./inbox.service');

    await expect(commitPublicImportReviewPlan()).resolves.toEqual({
      createdCount: 0,
      matchedCount: 3,
      skippedCount: 0,
    });

    expect(archiveItemSelectMock).toHaveBeenCalledWith('id');
    expect(archiveItemEqCollectionMock).toHaveBeenCalledWith('collection_id', 'collection-existing-1');
    expect(archiveItemEqEntityTypeMock).toHaveBeenCalledWith('entity_type', 'album');
    expect(archiveItemEqEntityIdMock).toHaveBeenCalledWith('entity_id', 'album-existing-1');
    expect(formalUpdateMock).toHaveBeenCalledWith({ note: 'Imported comment.' });
    expect(formalUpdateEqMock).toHaveBeenCalledWith('id', 'archive-item-existing-1');
    expect(externalInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_type: 'archive_item',
        entity_id: 'archive-item-existing-1',
        source_id: 'version-1:item:item-1:album-1',
      }),
    );
    expect(formalInsertMock).not.toHaveBeenCalledWith(expect.objectContaining({ collection_id: 'collection-existing-1' }));
  });

  it('updates a review item action and skip reason without writing formal library records', async () => {
    reviewSingleAfterUpdateMock.mockResolvedValue({
      data: {
        id: 'review-artist-1',
        entity_type: 'artist',
        display_title: 'The Beatles',
        source_name: 'anontraveler',
        source_id: 'artist-1',
        planned_action: 'skip',
        target_entity_id: null,
        skip_reason: 'Already in my library',
        error_message: null,
      },
      error: null,
    });
    const { updateImportReviewItemAction } = await import('./inbox.service');

    await expect(
      updateImportReviewItemAction({
        reviewItemId: 'review-artist-1',
        plannedAction: 'skip',
        skipReason: 'Already in my library',
      }),
    ).resolves.toEqual({
      id: 'review-artist-1',
      entityType: 'artist',
      displayTitle: 'The Beatles',
      sourceName: 'anontraveler',
      sourceId: 'artist-1',
      plannedAction: 'skip',
      targetEntityId: null,
      skipReason: 'Already in my library',
      errorMessage: null,
    });

    expect(getUserMock).toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalledWith('import_review_items');
    expect(reviewUpdateMock).toHaveBeenCalledWith({
      planned_action: 'skip',
      skip_reason: 'Already in my library',
      target_entity_id: null,
      error_message: null,
    });
    expect(reviewSelectAfterUpdateMock).toHaveBeenCalledWith(
      'id,entity_type,display_title,source_name,source_id,planned_action,target_entity_id,skip_reason,error_message,review_payload',
    );
    expect(reviewEqAfterUpdateMock).toHaveBeenCalledWith('id', 'review-artist-1');
    expect(reviewSingleAfterUpdateMock).toHaveBeenCalled();
  });

  it('matches an artist review item to an existing public artist as an admin', async () => {
    selectMock.mockReturnValue({ eq: reviewLookupEqMock });
    reviewSingleAfterUpdateMock.mockResolvedValue({
      data: {
        id: 'review-artist-1',
        entity_type: 'artist',
        display_title: 'The Beatles',
        source_name: 'anontraveler',
        source_id: 'artist-1',
        planned_action: 'match_existing',
        target_entity_id: 'artist-existing-1',
        skip_reason: '',
        error_message: null,
      },
      error: null,
    });
    const { matchImportReviewItem } = await import('./inbox.service');

    await expect(
      matchImportReviewItem({
        reviewItemId: 'review-artist-1',
        targetEntityId: 'artist-existing-1',
      }),
    ).resolves.toEqual({
      id: 'review-artist-1',
      entityType: 'artist',
      displayTitle: 'The Beatles',
      sourceName: 'anontraveler',
      sourceId: 'artist-1',
      plannedAction: 'match_existing',
      targetEntityId: 'artist-existing-1',
      skipReason: '',
      errorMessage: null,
    });

    expect(selectMock).toHaveBeenCalledWith('entity_type');
    expect(reviewLookupEqMock).toHaveBeenCalledWith('id', 'review-artist-1');
    expect(targetSelectMock).toHaveBeenCalledWith('id');
    expect(targetIdEqMock).toHaveBeenCalledWith('id', 'artist-existing-1');
    expect(targetVisibilityEqMock).toHaveBeenCalledWith('visibility', 'public');
    expect(reviewUpdateMock).toHaveBeenCalledWith({
      planned_action: 'match_existing',
      target_entity_id: 'artist-existing-1',
      skip_reason: '',
      error_message: null,
    });
  });

  it('rejects manual matching for unsupported review item entity types', async () => {
    selectMock.mockReturnValue({ eq: reviewLookupEqMock });
    reviewLookupMaybeSingleMock.mockResolvedValue({ data: { entity_type: 'archive_item' }, error: null });
    const { matchImportReviewItem } = await import('./inbox.service');

    await expect(
      matchImportReviewItem({
        reviewItemId: 'review-item-1',
        targetEntityId: 'archive-item-existing-1',
      }),
    ).rejects.toThrow('Only artist and album review items can be matched manually.');

    expect(targetSelectMock).not.toHaveBeenCalled();
    expect(reviewUpdateMock).not.toHaveBeenCalled();
  });

  it('rejects manual matching when the public target entity does not exist', async () => {
    selectMock.mockReturnValue({ eq: reviewLookupEqMock });
    targetMaybeSingleMock.mockResolvedValue({ data: null, error: null });
    const { matchImportReviewItem } = await import('./inbox.service');

    await expect(
      matchImportReviewItem({
        reviewItemId: 'review-artist-1',
        targetEntityId: 'missing-artist',
      }),
    ).rejects.toThrow('The selected public artist no longer exists.');

    expect(reviewUpdateMock).not.toHaveBeenCalled();
  });

  it('rejects manual matching for non-admin users', async () => {
    profileSingleMock.mockResolvedValue({ data: { role: 'user' }, error: null });
    const { matchImportReviewItem } = await import('./inbox.service');

    await expect(
      matchImportReviewItem({
        reviewItemId: 'review-artist-1',
        targetEntityId: 'artist-existing-1',
      }),
    ).rejects.toThrow('Only admins can match import review items.');

    expect(selectMock).not.toHaveBeenCalledWith('entity_type');
    expect(reviewUpdateMock).not.toHaveBeenCalled();
  });

  it('sorts Anontraveler review items by source ranking while keeping commit dependencies', async () => {
    const { createImportReviewPlan } = await import('./inbox.service');

    await expect(
      createImportReviewPlan({
        importJobId: 'job-1',
        sourceName: 'anontraveler',
        sourceUrl: 'https://www.anontraveler.com/rank/version/version-1',
        candidates: [
          {
            id: 'anontraveler:album:album-1',
            entityType: 'album',
            displayTitle: 'Rank One',
            displaySubtitle: 'Artist A',
            sourceName: 'anontraveler',
            metadata: { sourceRank: 1 },
          },
        ],
      }),
    ).resolves.toEqual({
      plannedCount: 1,
      plannedCounts: {
        artist: 0,
        album: 1,
        archive_collection: 0,
        archive_item: 0,
        song: 0,
        media_asset: 0,
      },
      items: [],
    });
  });
});
