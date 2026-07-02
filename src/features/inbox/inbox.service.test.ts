import { beforeEach, describe, expect, it, vi } from 'vitest';

const orderMock = vi.fn();
const selectMock = vi.fn(() => ({ order: orderMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));
const getSupabaseMock = vi.fn(() => ({
  from: fromMock,
}));

vi.mock('../../lib/supabase', () => ({
  getSupabase: () => getSupabaseMock(),
}));

describe('inbox.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    getSupabaseMock.mockReturnValue({
      from: fromMock,
    });
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
    expect(selectMock).toHaveBeenCalledWith('id,entity_type,display_title,display_subtitle,source_name');
    expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('uses local demo import candidates when Supabase is not configured', async () => {
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
});
