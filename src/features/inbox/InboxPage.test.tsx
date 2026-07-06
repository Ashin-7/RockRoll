import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { InboxPage } from './InboxPage';
import { AnontravelerPreview } from './anontraveler.types';
import {
  CommitImportReviewPlanResult,
  ImportCandidateSummary,
  ImportDraftJobSummary,
  ImportReviewItemSummary,
} from './inbox.types';

function createDeferred<T>(initialValue?: T) {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  void initialValue;

  return { promise, resolve };
}

function makeReviewItems(count: number): ImportReviewItemSummary[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `review-item-${index + 1}`,
    entityType: index % 2 === 0 ? 'artist' : 'album',
    displayTitle: `Review item ${index + 1}`,
    sourceName: 'anontraveler',
    sourceId: `source-${index + 1}`,
    plannedAction: 'create',
    targetEntityId: null,
    skipReason: '',
    errorMessage: null,
  }));
}

const candidates: ImportCandidateSummary[] = [
  {
    id: 'candidate-1',
    entityType: 'artist',
    displayTitle: 'The Jimi Hendrix Experience',
    displaySubtitle: 'US - American-English rock band',
    sourceName: 'musicbrainz',
  },
];

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
      styles: ['节拍音乐', '摇滚'],
      albumType: '专辑',
      note: 'Beat music marker.',
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
  ],
  skippedSongs: 0,
};

const reviewItems: ImportReviewItemSummary[] = [
  {
    id: 'review-artist-1',
    entityType: 'artist',
    displayTitle: 'The Beatles',
    sourceName: 'anontraveler',
    sourceId: 'artist-1',
    plannedAction: 'create',
    targetEntityId: null,
    skipReason: '',
    errorMessage: null,
  },
  {
    id: 'review-archive-item-1',
    entityType: 'archive_item',
    displayTitle: 'Please Please Me',
    sourceName: 'anontraveler',
    sourceId: 'item-1',
    plannedAction: 'create',
    targetEntityId: null,
    skipReason: '',
    errorMessage: null,
  },
];

const draftJobs: ImportDraftJobSummary[] = [
  {
    id: 'job-existing-1',
    sourceName: 'anontraveler',
    query: 'https://www.anontraveler.com/rank/version/version-1',
    completedAt: '2026-07-06T01:00:00.000Z',
    candidateCount: 2,
  },
];

describe('InboxPage', () => {
  it('loads and renders import candidates from the provided loader', async () => {
    const user = userEvent.setup();
    renderWithI18n(<InboxPage onLoadCandidates={vi.fn().mockResolvedValue(candidates)} />);

    expect(screen.getByText('Loading import candidates...')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: '展开候选' }));
    expect(screen.getByText('The Jimi Hendrix Experience')).toBeInTheDocument();
    expect(screen.getByText('US - American-English rock band')).toBeInTheDocument();
    expect(screen.getByText('MusicBrainz')).toBeInTheDocument();
    expect(screen.getByText('Artist')).toBeInTheDocument();
  });

  it('renders the inbox CRUD UI pattern with metrics, sections, and candidate rows', async () => {
    const user = userEvent.setup();
    renderWithI18n(<InboxPage candidates={candidates} />);

    expect(screen.getByText('Candidates filed')).toBeInTheDocument();
    expect(screen.getByText('Preview sources')).toBeInTheDocument();
    expect(screen.getByText('Ready preview')).toBeInTheDocument();
    expect(screen.getByText('Import workflow')).toBeInTheDocument();
    expect(screen.getByText('Source / Anontraveler')).toBeInTheDocument();
    expect(screen.getByText('Preview output')).toBeInTheDocument();
    expect(screen.getByText('Candidate index')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '展开候选' }));
    expect(screen.getByText('Candidate')).toBeInTheDocument();
    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Summary')).toBeInTheDocument();
  });

  it('renders candidate index as a collapsible card with visible counts', async () => {
    const user = userEvent.setup();
    renderWithI18n(<InboxPage candidates={candidates} />);

    const toggleButton = screen.getByRole('button', { name: '展开候选' });
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('共 1 条，当前展示 0 条')).toBeInTheDocument();
    expect(screen.queryByText('Candidate')).not.toBeInTheDocument();
    expect(screen.queryByText('US - American-English rock band')).not.toBeInTheDocument();

    await user.click(toggleButton);

    expect(screen.getByRole('button', { name: '收起候选' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('共 1 条，当前展示 1 条')).toBeInTheDocument();
    expect(screen.getByText('Candidate')).toBeInTheDocument();
    expect(screen.getByText('US - American-English rock band')).toBeInTheDocument();
  });

  it('renders empty state when no candidates exist', async () => {
    renderWithI18n(<InboxPage onLoadCandidates={vi.fn().mockResolvedValue([])} />);

    expect(await screen.findByText('No import candidates waiting yet.')).toBeInTheDocument();
  });

  it('renders an error state when candidates cannot load', async () => {
    renderWithI18n(<InboxPage onLoadCandidates={vi.fn().mockRejectedValue(new Error('network failed'))} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('network failed');
  });

  it('renders Chinese inbox messages', () => {
    window.localStorage.setItem('rockroll.locale', 'zh-CN');

    renderWithI18n(<InboxPage candidates={[]} />);

    expect(screen.queryByText('Import Inbox')).not.toBeInTheDocument();
    expect(screen.getAllByText('0')).toHaveLength(3);
  });

  it('previews a public Anontraveler URL without writing import candidates', async () => {
    const user = userEvent.setup();
    const onPreviewAnontraveler = vi.fn().mockResolvedValue(anontravelerPreview);

    renderWithI18n(
      <InboxPage
        candidates={[]}
        onPreviewAnontraveler={onPreviewAnontraveler}
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
    expect(screen.getByText('Albums to preview: 1')).toBeInTheDocument();
    expect(screen.getByText('Archive items to preview: 1')).toBeInTheDocument();
    expect(screen.getByText('Songs skipped: 0')).toBeInTheDocument();
    expect(screen.getByText('Preview collection')).toBeInTheDocument();
    expect(screen.getByText('Album samples')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '展开候选' }));
    expect(screen.getAllByText('Please Please Me')).toHaveLength(2);
    expect(screen.getAllByText('The Beatles')).toHaveLength(2);
    expect(screen.getByRole('img', { name: 'Please Please Me 封面' })).toHaveAttribute(
      'src',
      'https://img.example.test/please-please-me.jpg',
    );
    expect(screen.getByText('# 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Please Please Me metadata')).toHaveTextContent('1963');
    expect(screen.getByText('节拍音乐')).toBeInTheDocument();
    expect(screen.getByText('摇滚')).toBeInTheDocument();
    expect(screen.getByText('Beat music marker.')).toBeInTheDocument();
    expect(screen.getByText('Anontraveler artist candidate')).toBeInTheDocument();
    expect(screen.getByText('The Beatles - 1963')).toBeInTheDocument();
    expect(screen.getAllByText('Anontraveler')).toHaveLength(3);
  });

  it('saves preview candidates to Import Inbox draft after preview succeeds', async () => {
    const user = userEvent.setup();
    const onPreviewAnontraveler = vi.fn().mockResolvedValue(anontravelerPreview);
    const onSaveCandidatesDraft = vi.fn().mockResolvedValue({ importJobId: 'job-1', savedCount: 2 });
    const onLoadCandidates = vi.fn().mockResolvedValue(candidates);

    renderWithI18n(
      <InboxPage
        onLoadCandidates={onLoadCandidates}
        onPreviewAnontraveler={onPreviewAnontraveler}
        onSaveCandidatesDraft={onSaveCandidatesDraft}
      />,
    );

    await screen.findByRole('button', { name: '展开候选' });
    await user.type(
      screen.getByLabelText('Anontraveler rank version URL'),
      'https://www.anontraveler.com/rank/version/version-1',
    );
    await user.click(screen.getByRole('button', { name: 'Preview Anontraveler' }));
    await user.click(await screen.findByRole('button', { name: '保存到导入草稿' }));

    expect(onSaveCandidatesDraft).toHaveBeenCalledWith({
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
            sourceRank: 1,
          },
        },
      ],
    });
    expect(await screen.findByText('已保存 2 条候选到导入草稿。')).toBeInTheDocument();
    expect(onLoadCandidates).toHaveBeenCalledTimes(2);
  });

  it('explains the required migration when Anontraveler draft saving hits the source constraint', async () => {
    const user = userEvent.setup();
    const onPreviewAnontraveler = vi.fn().mockResolvedValue(anontravelerPreview);
    const onSaveCandidatesDraft = vi
      .fn()
      .mockRejectedValue(
        new Error(
          'new row for relation "import_jobs" violates check constraint "import_jobs_source_name_check"',
        ),
      );

    renderWithI18n(
      <InboxPage
        candidates={[]}
        onPreviewAnontraveler={onPreviewAnontraveler}
        onSaveCandidatesDraft={onSaveCandidatesDraft}
      />,
    );

    await user.type(
      screen.getByLabelText('Anontraveler rank version URL'),
      'https://www.anontraveler.com/rank/version/version-1',
    );
    await user.click(screen.getByRole('button', { name: 'Preview Anontraveler' }));
    await user.click(await screen.findByRole('button', { name: '保存到导入草稿' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '需要应用数据库 migration：请应用 20260706021727_allow_anontraveler_import_source.sql',
    );
  });

  it('generates and renders an import review plan after saving an Anontraveler draft', async () => {
    const user = userEvent.setup();
    const onPreviewAnontraveler = vi.fn().mockResolvedValue(anontravelerPreview);
    const onSaveCandidatesDraft = vi.fn().mockResolvedValue({ importJobId: 'job-1', savedCount: 2 });
    const onCreateReviewPlan = vi.fn().mockResolvedValue({ plannedCount: 2, items: reviewItems });

    renderWithI18n(
      <InboxPage
        candidates={[]}
        onPreviewAnontraveler={onPreviewAnontraveler}
        onSaveCandidatesDraft={onSaveCandidatesDraft}
        onCreateReviewPlan={onCreateReviewPlan}
      />,
    );

    await user.type(
      screen.getByLabelText('Anontraveler rank version URL'),
      'https://www.anontraveler.com/rank/version/version-1',
    );
    await user.click(screen.getByRole('button', { name: 'Preview Anontraveler' }));
    await user.click(await screen.findByRole('button', { name: '保存到导入草稿' }));
    await user.click(await screen.findByRole('button', { name: '生成确认计划' }));

    expect(onCreateReviewPlan).toHaveBeenCalledWith({
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
            sourceRank: 1,
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
    });
    expect(await screen.findByText('确认计划已生成：2 条。')).toBeInTheDocument();
    expect(screen.getByText('确认计划')).toBeInTheDocument();
    expect(screen.getByText('档案条目')).toBeInTheDocument();
    expect(screen.getAllByText('创建')).toHaveLength(2);
  });

  it('continues an existing draft by re-previewing its saved URL before generating a review plan', async () => {
    const user = userEvent.setup();
    const onLoadImportDraftJobs = vi.fn().mockResolvedValue(draftJobs);
    const onPreviewAnontraveler = vi.fn().mockResolvedValue(anontravelerPreview);
    const onCreateReviewPlan = vi.fn().mockResolvedValue({ plannedCount: 2, items: reviewItems });

    renderWithI18n(
      <InboxPage
        candidates={[]}
        onLoadImportRole={vi.fn().mockResolvedValue('admin')}
        onLoadImportDraftJobs={onLoadImportDraftJobs}
        onPreviewAnontraveler={onPreviewAnontraveler}
        onCreateReviewPlan={onCreateReviewPlan}
      />,
    );

    expect(await screen.findByText('已有草稿')).toBeInTheDocument();
    expect(screen.getByText('2 条候选')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '继续草稿 job-existing-1' }));

    expect(onPreviewAnontraveler).toHaveBeenCalledWith('https://www.anontraveler.com/rank/version/version-1');
    expect(await screen.findByText('已从保存的 URL 加载草稿。')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://www.anontraveler.com/rank/version/version-1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '生成确认计划' }));

    expect(onCreateReviewPlan).toHaveBeenCalledWith({
      importJobId: 'job-existing-1',
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
            sourceRank: 1,
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
    });
    expect(await screen.findByText('确认计划已生成：2 条。')).toBeInTheDocument();
  });

  it('updates a review plan item to skip and restores it to create', async () => {
    const user = userEvent.setup();
    const onPreviewAnontraveler = vi.fn().mockResolvedValue(anontravelerPreview);
    const onSaveCandidatesDraft = vi.fn().mockResolvedValue({ importJobId: 'job-1', savedCount: 2 });
    const onCreateReviewPlan = vi.fn().mockResolvedValue({ plannedCount: 2, items: reviewItems });
    const onUpdateReviewItemAction = vi
      .fn()
      .mockResolvedValueOnce({
        ...reviewItems[0],
        plannedAction: 'skip',
        skipReason: 'Already in my library',
      })
      .mockResolvedValueOnce({
        ...reviewItems[0],
        plannedAction: 'create',
        skipReason: '',
      });

    renderWithI18n(
      <InboxPage
        candidates={[]}
        onPreviewAnontraveler={onPreviewAnontraveler}
        onSaveCandidatesDraft={onSaveCandidatesDraft}
        onCreateReviewPlan={onCreateReviewPlan}
        onUpdateReviewItemAction={onUpdateReviewItemAction}
      />,
    );

    await user.type(
      screen.getByLabelText('Anontraveler rank version URL'),
      'https://www.anontraveler.com/rank/version/version-1',
    );
    await user.click(screen.getByRole('button', { name: 'Preview Anontraveler' }));
    await user.click(await screen.findByRole('button', { name: '保存到导入草稿' }));
    await user.click(await screen.findByRole('button', { name: '生成确认计划' }));

    const skipReasonInput = await screen.findByLabelText('跳过原因：The Beatles');
    await user.type(skipReasonInput, 'Already in my library');
    await user.click(screen.getByRole('button', { name: '跳过 The Beatles' }));

    expect(onUpdateReviewItemAction).toHaveBeenCalledWith({
      reviewItemId: 'review-artist-1',
      plannedAction: 'skip',
      skipReason: 'Already in my library',
    });
    expect(await screen.findByText('跳过')).toBeInTheDocument();
    expect(screen.getByText('Already in my library')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '恢复 The Beatles 为创建' }));

    expect(onUpdateReviewItemAction).toHaveBeenLastCalledWith({
      reviewItemId: 'review-artist-1',
      plannedAction: 'create',
      skipReason: '',
    });
    expect(await screen.findAllByText('创建')).toHaveLength(2);
  });

  it('shows public commit action only for admins and commits the full review plan', async () => {
    const user = userEvent.setup();
    const pagedReviewItems = makeReviewItems(26);
    const onPreviewAnontraveler = vi.fn().mockResolvedValue(anontravelerPreview);
    const onSaveCandidatesDraft = vi.fn().mockResolvedValue({ importJobId: 'job-1', savedCount: 2 });
    const onCreateReviewPlan = vi.fn().mockResolvedValue({ plannedCount: 26, items: pagedReviewItems });
    const onLoadImportDraftJobs = vi.fn().mockResolvedValue(draftJobs);
    const onCommitPublicImportReviewPlan = vi.fn().mockResolvedValue({
      createdCount: 25,
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
        onLoadImportDraftJobs={onLoadImportDraftJobs}
        onCommitPublicImportReviewPlan={onCommitPublicImportReviewPlan}
      />,
    );

    await user.type(
      screen.getByLabelText('Anontraveler rank version URL'),
      'https://www.anontraveler.com/rank/version/version-1',
    );
    await user.click(screen.getByRole('button', { name: 'Preview Anontraveler' }));
    await user.click(await screen.findByRole('button', { name: '保存到导入草稿' }));
    await user.click(await screen.findByRole('button', { name: '生成确认计划' }));

    expect(await screen.findByText('确认计划已生成：26 条。')).toBeInTheDocument();
    expect(screen.getByText('确认计划第 1 页，共 2 页')).toBeInTheDocument();
    expect(screen.getByText('Review item 1')).toBeInTheDocument();
    expect(screen.queryByText('Review item 26')).not.toBeInTheDocument();
    expect(screen.getByText('https://www.anontraveler.com/rank/version/version-1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '下一页' }));

    expect(screen.getByText('确认计划第 2 页，共 2 页')).toBeInTheDocument();
    expect(screen.getByText('Review item 26')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '提交公开导入' }));

    expect(onCommitPublicImportReviewPlan).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Review item 26')).not.toBeInTheDocument();
    expect(screen.queryByText('Classic rock guide')).not.toBeInTheDocument();
    expect(screen.queryByText('Please Please Me')).not.toBeInTheDocument();
    expect(screen.queryByText('https://www.anontraveler.com/rank/version/version-1')).not.toBeInTheDocument();
    expect(await screen.findByText('公开导入已提交：创建 25 条，匹配 1 条，跳过 0 条。')).toBeInTheDocument();
  });

  it('shows a loading status while committing public import', async () => {
    const user = userEvent.setup();
    const deferredCommit = createDeferred<CommitImportReviewPlanResult>();
    const onCommitPublicImportReviewPlan = vi.fn(() => deferredCommit.promise);

    renderWithI18n(
      <InboxPage
        candidates={[]}
        onLoadImportRole={vi.fn().mockResolvedValue('admin')}
        onPreviewAnontraveler={vi.fn().mockResolvedValue(anontravelerPreview)}
        onSaveCandidatesDraft={vi.fn().mockResolvedValue({ importJobId: 'job-1', savedCount: 2 })}
        onCreateReviewPlan={vi.fn().mockResolvedValue({ plannedCount: 2, items: reviewItems })}
        onCommitPublicImportReviewPlan={onCommitPublicImportReviewPlan}
      />,
    );

    await user.type(
      screen.getByLabelText('Anontraveler rank version URL'),
      'https://www.anontraveler.com/rank/version/version-1',
    );
    await user.click(screen.getByRole('button', { name: 'Preview Anontraveler' }));
    await user.click(await screen.findByRole('button', { name: '保存到导入草稿' }));
    await user.click(await screen.findByRole('button', { name: '生成确认计划' }));
    await user.click(await screen.findByRole('button', { name: '提交公开导入' }));

    expect(screen.getByRole('status')).toHaveTextContent('正在提交公开导入，请保持页面打开。');
    expect(screen.getByRole('button', { name: '正在提交公开导入...' })).toBeDisabled();

    deferredCommit.resolve({ createdCount: 1, matchedCount: 0, skippedCount: 0 });
    expect(await screen.findByText('公开导入已提交：创建 1 条，匹配 0 条，跳过 0 条。')).toBeInTheDocument();
  });

  it('renders the review plan workflow in Chinese when Chinese locale is active', async () => {
    window.localStorage.setItem('rockroll.locale', 'zh-CN');
    const user = userEvent.setup();
    const pagedReviewItems = makeReviewItems(26);
    const onPreviewAnontraveler = vi.fn().mockResolvedValue(anontravelerPreview);
    const onSaveCandidatesDraft = vi.fn().mockResolvedValue({ importJobId: 'job-1', savedCount: 2 });
    const onCreateReviewPlan = vi.fn().mockResolvedValue({ plannedCount: 26, items: pagedReviewItems });

    renderWithI18n(
      <InboxPage
        candidates={[]}
        onLoadImportRole={vi.fn().mockResolvedValue('admin')}
        onPreviewAnontraveler={onPreviewAnontraveler}
        onSaveCandidatesDraft={onSaveCandidatesDraft}
        onCreateReviewPlan={onCreateReviewPlan}
      />,
    );

    await user.type(
      screen.getByLabelText('匿名旅行者榜单版本 URL'),
      'https://www.anontraveler.com/rank/version/version-1',
    );
    await user.click(screen.getByRole('button', { name: '预览匿名旅行者' }));
    await user.click(await screen.findByRole('button', { name: '保存到导入草稿' }));
    await user.click(await screen.findByRole('button', { name: '生成确认计划' }));

    expect(await screen.findByText('确认计划已生成：26 条。')).toBeInTheDocument();
    expect(screen.getByText('导入前确认')).toBeInTheDocument();
    expect(screen.getByText('确认计划')).toBeInTheDocument();
    expect(screen.getByText('确认计划第 1 页，共 2 页')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '上一页' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '下一页' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '提交公开导入' })).toBeInTheDocument();
    expect(screen.getAllByText('创建').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('跳过原因：Review item 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '跳过 Review item 1' })).toBeInTheDocument();
    expect(screen.queryByText('Review plan')).not.toBeInTheDocument();
    expect(screen.queryByText('Commit public import')).not.toBeInTheDocument();
  });

  it('does not show public commit action for non-admin users', async () => {
    renderWithI18n(
      <InboxPage
        candidates={[]}
        onLoadImportRole={vi.fn().mockResolvedValue('user')}
      />,
    );

    expect(screen.queryByRole('button', { name: '提交公开导入' })).not.toBeInTheDocument();
  });
});
