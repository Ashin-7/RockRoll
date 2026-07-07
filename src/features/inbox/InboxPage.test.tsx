import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { InboxPage } from './InboxPage';
import { AnontravelerPreview } from './anontraveler.types';
import { CommitImportReviewPlanResult } from './inbox.types';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

const anontravelerPreview: AnontravelerPreview = {
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
      styles: ['Beat', 'Rock'],
      albumType: 'Album',
      note: 'Beat music marker.',
    },
    {
      externalId: 'album-2',
      title: 'Rubber Soul',
      artistName: 'The Beatles',
      releaseYear: 1965,
      coverUrl: '',
      styles: ['Folk rock'],
      albumType: 'Album',
      note: '',
    },
    {
      externalId: 'album-3',
      title: 'Revolver',
      artistName: 'The Beatles',
      releaseYear: 1966,
      coverUrl: '',
      styles: [],
      albumType: 'Album',
      note: '',
    },
    {
      externalId: 'album-4',
      title: 'Abbey Road',
      artistName: 'The Beatles',
      releaseYear: 1969,
      coverUrl: '',
      styles: [],
      albumType: 'Album',
      note: '',
    },
  ],
  archiveItems: [
    { externalId: 'item-1', albumExternalId: 'album-1', displayTitle: 'Please Please Me', position: 1, note: 'Beat music marker.' },
    { externalId: 'item-2', albumExternalId: 'album-2', displayTitle: 'Rubber Soul', position: 2, note: '' },
    { externalId: 'item-3', albumExternalId: 'album-3', displayTitle: 'Revolver', position: 3, note: '' },
    { externalId: 'item-4', albumExternalId: 'album-4', displayTitle: 'Abbey Road', position: 4, note: '' },
  ],
  skippedSongs: 0,
};

afterEach(() => {
  window.localStorage.clear();
});

describe('InboxPage', () => {
  it('previews an Anontraveler URL with total counts and only three album cards', async () => {
    const user = userEvent.setup();
    const onPreviewAnontraveler = vi.fn().mockResolvedValue(anontravelerPreview);

    renderWithI18n(
      <InboxPage
        candidates={[]}
        onPreviewAnontraveler={onPreviewAnontraveler}
        onLoadImportRole={vi.fn().mockResolvedValue('admin')}
      />,
    );

    await user.type(
      screen.getByLabelText('Anontraveler rank version URL'),
      'https://www.anontraveler.com/rank/version/version-1',
    );
    await user.click(screen.getByRole('button', { name: 'Preview Anontraveler' }));

    expect(onPreviewAnontraveler).toHaveBeenCalledWith('https://www.anontraveler.com/rank/version/version-1');
    expect(await screen.findByText('Classic rock guide')).toBeInTheDocument();
    expect(screen.getByText('Artists to preview: 1')).toBeInTheDocument();
    expect(screen.getByText('Albums to preview: 4')).toBeInTheDocument();
    expect(screen.getByText('Archive items to preview: 4')).toBeInTheDocument();
    expect(screen.getByText('Songs skipped: 0')).toBeInTheDocument();
    expect(screen.getByText('Please Please Me')).toBeInTheDocument();
    expect(screen.getByText('Rubber Soul')).toBeInTheDocument();
    expect(screen.getByText('Revolver')).toBeInTheDocument();
    expect(screen.queryByText('Abbey Road')).not.toBeInTheDocument();
    expect(screen.queryByText('Candidate index')).not.toBeInTheDocument();
    expect(screen.queryByText('Review plan')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /draft/i })).not.toBeInTheDocument();
  });

  it('imports the preview with one button by saving candidates, creating a plan, and committing', async () => {
    const user = userEvent.setup();
    const onPreviewAnontraveler = vi.fn().mockResolvedValue(anontravelerPreview);
    const onSaveCandidatesDraft = vi.fn().mockResolvedValue({ importJobId: 'job-1', savedCount: 5 });
    const onCreateReviewPlan = vi.fn().mockResolvedValue({ plannedCount: 6, items: [] });
    const onCommitPublicImportReviewPlan = vi.fn().mockResolvedValue({
      createdCount: 4,
      matchedCount: 1,
      skippedCount: 0,
    });

    renderWithI18n(
      <InboxPage
        candidates={[]}
        onLoadImportRole={vi.fn().mockResolvedValue('admin')}
        onPreviewAnontraveler={onPreviewAnontraveler}
        onSaveCandidatesDraft={onSaveCandidatesDraft}
        onCreateReviewPlan={onCreateReviewPlan}
        onCommitPublicImportReviewPlan={onCommitPublicImportReviewPlan}
      />,
    );

    await user.type(
      screen.getByLabelText('Anontraveler rank version URL'),
      'https://www.anontraveler.com/rank/version/version-1',
    );
    await user.click(screen.getByRole('button', { name: 'Preview Anontraveler' }));
    await user.click(await screen.findByRole('button', { name: 'Import full preview' }));

    expect(onSaveCandidatesDraft).toHaveBeenCalledWith({
      sourceName: 'anontraveler',
      query: 'https://www.anontraveler.com/rank/version/version-1',
      candidates: expect.arrayContaining([
        expect.objectContaining({ id: 'anontraveler:artist:artist-1', entityType: 'artist' }),
        expect.objectContaining({ id: 'anontraveler:album:album-1', entityType: 'album' }),
      ]),
    });
    expect(onCreateReviewPlan).toHaveBeenCalledWith({
      importJobId: 'job-1',
      sourceName: 'anontraveler',
      sourceUrl: 'https://www.anontraveler.com/rank/version/version-1',
      candidates: expect.any(Array),
      archiveCollection: {
        externalId: 'version-1',
        title: 'Classic rock guide',
        description: 'Albums to explore.',
        collectionType: 'album_rank',
      },
      archiveItems: anontravelerPreview.archiveItems,
    });
    expect(onCommitPublicImportReviewPlan).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Public import committed: created 4, matched 1, skipped 0.')).toBeInTheDocument();
    expect(screen.queryByText('Classic rock guide')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Anontraveler rank version URL')).toHaveValue('');
  });

  it('shows a loading status while the full import is running', async () => {
    const user = userEvent.setup();
    const deferredCommit = createDeferred<CommitImportReviewPlanResult>();

    renderWithI18n(
      <InboxPage
        candidates={[]}
        onLoadImportRole={vi.fn().mockResolvedValue('admin')}
        onPreviewAnontraveler={vi.fn().mockResolvedValue(anontravelerPreview)}
        onSaveCandidatesDraft={vi.fn().mockResolvedValue({ importJobId: 'job-1', savedCount: 5 })}
        onCreateReviewPlan={vi.fn().mockResolvedValue({ plannedCount: 6, items: [] })}
        onCommitPublicImportReviewPlan={vi.fn(() => deferredCommit.promise)}
      />,
    );

    await user.type(
      screen.getByLabelText('Anontraveler rank version URL'),
      'https://www.anontraveler.com/rank/version/version-1',
    );
    await user.click(screen.getByRole('button', { name: 'Preview Anontraveler' }));
    await user.click(await screen.findByRole('button', { name: 'Import full preview' }));

    expect(screen.getByRole('status')).toHaveTextContent('Importing full preview. Keep this page open.');
    expect(screen.getByRole('button', { name: 'Importing...' })).toBeDisabled();

    deferredCommit.resolve({ createdCount: 1, matchedCount: 0, skippedCount: 0 });
    expect(await screen.findByText('Public import committed: created 1, matched 0, skipped 0.')).toBeInTheDocument();
  });

  it('does not show the full import button for non-admin users', async () => {
    const user = userEvent.setup();

    renderWithI18n(
      <InboxPage
        candidates={[]}
        onLoadImportRole={vi.fn().mockResolvedValue('user')}
        onPreviewAnontraveler={vi.fn().mockResolvedValue(anontravelerPreview)}
      />,
    );

    await user.type(
      screen.getByLabelText('Anontraveler rank version URL'),
      'https://www.anontraveler.com/rank/version/version-1',
    );
    await user.click(screen.getByRole('button', { name: 'Preview Anontraveler' }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Import full preview' })).not.toBeInTheDocument();
    });
  });

  it('renders the simplified import workflow in Chinese when Chinese locale is active', async () => {
    window.localStorage.setItem('rockroll.locale', 'zh-CN');
    const user = userEvent.setup();

    renderWithI18n(
      <InboxPage
        candidates={[]}
        onLoadImportRole={vi.fn().mockResolvedValue('admin')}
        onPreviewAnontraveler={vi.fn().mockResolvedValue(anontravelerPreview)}
      />,
    );

    await user.type(
      screen.getByLabelText('匿名旅行者榜单版本 URL'),
      'https://www.anontraveler.com/rank/version/version-1',
    );
    await user.click(screen.getByRole('button', { name: '预览匿名旅行者' }));

    expect(await screen.findByText('待预览档案条目：4')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '完整导入预览数据' })).toBeInTheDocument();
    expect(screen.queryByText('候选索引')).not.toBeInTheDocument();
    expect(screen.queryByText('确认计划')).not.toBeInTheDocument();
    expect(screen.queryByText('已有草稿')).not.toBeInTheDocument();
  });
});
