import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { ArchivePage } from './ArchivePage';
import { ArchiveCollectionSummary } from './archive.types';
import { AnontravelerPreview, AnontravelerRankDirectoryPage } from '../inbox/anontraveler.types';
import { ImportCandidateSummary, ImportReviewItemSummary } from '../inbox/inbox.types';

const collections: ArchiveCollectionSummary[] = [
  {
    id: 'collection-1',
    title: 'Classic rock guide',
    source: 'anontraveler',
    sourceUrl: 'https://example.test/rank/version/1',
    description: 'Albums to explore.',
    collectionType: 'album_rank',
  },
];

const anontravelerPreview: AnontravelerPreview = {
  versionId: 'version-1',
  sourceUrl: 'https://www.anontraveler.com/rank/version/version-1',
  collection: {
    externalId: 'version-1',
    title: 'Preview collection title',
    description: 'Preview collection description.',
    source: 'anontraveler',
    collectionType: 'album_rank',
  },
  artists: [{ externalId: 'artist-1', name: 'Artist one' }],
  albums: [
    {
      externalId: 'album-1',
      title: 'Album one',
      artistName: 'Artist one',
      releaseYear: 2001,
      coverUrl: 'https://img.example.test/album-one.jpg',
      styles: ['Rock'],
      albumType: 'Album',
      note: 'Opening note.',
    },
    {
      externalId: 'album-2',
      title: 'Album two',
      artistName: 'Artist two',
      releaseYear: 2002,
      coverUrl: '',
      styles: ['Pop'],
      albumType: 'Album',
      note: '',
    },
    {
      externalId: 'album-3',
      title: 'Album three',
      artistName: 'Artist three',
      releaseYear: 2003,
      coverUrl: '',
      styles: ['Folk'],
      albumType: 'Album',
      note: '',
    },
    {
      externalId: 'album-4',
      title: 'Album four',
      artistName: 'Artist four',
      releaseYear: 2004,
      coverUrl: '',
      styles: ['Jazz'],
      albumType: 'Album',
      note: '',
    },
  ],
  archiveItems: [
    { externalId: 'item-1', albumExternalId: 'album-1', displayTitle: 'Album one', position: 1, note: 'Opening note.' },
    { externalId: 'item-2', albumExternalId: 'album-2', displayTitle: 'Album two', position: 2, note: '' },
    { externalId: 'item-3', albumExternalId: 'album-3', displayTitle: 'Album three', position: 3, note: '' },
    { externalId: 'item-4', albumExternalId: 'album-4', displayTitle: 'Album four', position: 4, note: '' },
  ],
  skippedSongs: 2,
};

const previewCandidates: ImportCandidateSummary[] = [
  {
    id: 'anontraveler:album:album-1',
    entityType: 'album',
    displayTitle: 'Album one',
    displaySubtitle: 'Artist one',
    sourceName: 'anontraveler',
  },
];

const reviewItems: ImportReviewItemSummary[] = [
  {
    id: 'review-artist-1',
    entityType: 'artist',
    displayTitle: 'Artist one',
    sourceName: 'anontraveler',
    sourceId: 'artist-1',
    plannedAction: 'create',
    targetEntityId: null,
    skipReason: '',
    errorMessage: null,
  },
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
  },
  {
    id: 'review-item-1',
    entityType: 'archive_item',
    displayTitle: 'Album one',
    sourceName: 'anontraveler',
    sourceId: 'item-1',
    plannedAction: 'create',
    targetEntityId: null,
    skipReason: '',
    errorMessage: null,
  },
];

const rankDirectoryItems = [
  {
    title: 'Classic rock guide',
    versionId: 'version-1',
    sourceUrl: 'https://www.anontraveler.com/rank/version/version-1',
    itemCount: 496,
    status: 'pending' as const,
    discoveredAt: '2026-07-08T01:00:00.000Z',
    lastImportedAt: null,
  },
  {
    title: 'Imported guide',
    versionId: 'version-2',
    sourceUrl: 'https://www.anontraveler.com/rank/version/version-2',
    itemCount: null,
    status: 'imported' as const,
    discoveredAt: '2026-07-08T01:00:00.000Z',
    lastImportedAt: '2026-07-08T02:00:00.000Z',
  },
];

function rankDirectoryPage(
  items: AnontravelerRankDirectoryPage['items'],
  page: number,
  total: number,
  hasMore: boolean,
): AnontravelerRankDirectoryPage {
  return {
    items,
    total,
    page,
    perPage: 2,
    hasMore,
  };
}

describe('ArchivePage', () => {
  it('renders archive sections', async () => {
    renderWithI18n(<ArchivePage onLoadImportRole={async () => 'admin'} />);

    expect(screen.getByText('Music Archive')).toBeInTheDocument();
    expect(screen.getByText('Artists')).toBeInTheDocument();
    expect(screen.getByText('Albums')).toBeInTheDocument();
    expect(screen.getByText('Genres')).toBeInTheDocument();
    expect(screen.getByText('Collection / create')).toBeInTheDocument();
    expect(await screen.findByText('Identity')).toBeInTheDocument();
    expect(screen.getByText('Source profile')).toBeInTheDocument();
  });

  it('loads and renders archive collections', async () => {
    const user = userEvent.setup();

    renderWithI18n(<ArchivePage onLoadCollections={async () => collections} onLoadImportRole={async () => 'admin'} />);

    expect(screen.getByText('Loading archive collections...')).toBeInTheDocument();
    expect(await screen.findByText('Classic rock guide')).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Archive collections' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Source' })).not.toBeInTheDocument();

    const collectionIndex = screen.getAllByText('Archive collections')[1].closest('details');
    expect(collectionIndex).not.toBeNull();
    expect(collectionIndex).toHaveAttribute('open');

    const collectionCard = screen.getByText('Classic rock guide').closest('article');
    expect(collectionCard).not.toBeNull();
    expect(screen.getByText('Classic rock guide').closest('details')).toBe(collectionIndex);

    expect(screen.getAllByText('anontraveler').length).toBeGreaterThan(0);
    expect(screen.getAllByText('album_rank').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Open collection' })).toHaveAttribute('href', '#archive/collection-1');
    expect(screen.getByRole('link', { name: 'Open source link' })).toHaveAttribute(
      'href',
      'https://example.test/rank/version/1',
    );
    expect(screen.getByText('Albums to explore.')).toHaveClass('archive-collection-description');
    expect(await screen.findByRole('button', { name: 'Edit Classic rock guide' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Classic rock guide' })).toBeInTheDocument();
  });

  it('hides archive collection write actions for non-admin users', async () => {
    renderWithI18n(
      <ArchivePage onLoadCollections={async () => collections} onLoadImportRole={async () => 'user'} />,
    );

    expect(await screen.findByText('Classic rock guide')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open collection' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Classic rock guide' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Classic rock guide' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add collection' })).not.toBeInTheDocument();
  });

  it('lets admins match artist and album review items without changing the URL import flow', async () => {
    const user = userEvent.setup();
    const loadReviewItems = vi.fn().mockResolvedValue(reviewItems);
    const matchReviewItem = vi.fn().mockResolvedValue({
      ...reviewItems[0],
      plannedAction: 'match_existing',
      targetEntityId: 'artist-existing-1',
    });

    renderWithI18n(
      <ArchivePage
        onLoadCollections={async () => []}
        onLoadImportRole={async () => 'admin'}
        onLoadImportReviewItems={loadReviewItems}
        onMatchImportReviewItem={matchReviewItem}
      />,
    );

    await user.click(await screen.findByRole('button', { name: 'Load manual matches' }));

    expect(loadReviewItems).toHaveBeenCalled();
    expect(await screen.findByText('Artist one')).toBeInTheDocument();
    expect(screen.getByText('Album one')).toBeInTheDocument();
    expect(screen.queryByText('archive_item')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Existing public artist ID for Artist one'), 'artist-existing-1');
    await user.click(screen.getByRole('button', { name: 'Match Artist one' }));

    expect(matchReviewItem).toHaveBeenCalledWith({
      reviewItemId: 'review-artist-1',
      targetEntityId: 'artist-existing-1',
    });
    expect(await screen.findByText('Artist one is set to match an existing artist.')).toBeInTheDocument();
  });

  it('creates an archive collection and refreshes the list', async () => {
    const user = userEvent.setup();
    const loadCollections = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(collections);
    const createCollection = vi.fn().mockResolvedValue(undefined);

    renderWithI18n(
      <ArchivePage
        onCreateCollection={createCollection}
        onLoadCollections={loadCollections}
        onLoadImportRole={async () => 'admin'}
      />,
    );

    await user.type(await screen.findByLabelText('Title'), 'Classic rock guide');
    await user.type(screen.getByLabelText('Source'), 'anontraveler');
    await user.type(screen.getByLabelText('Source URL'), 'https://example.test/rank/version/1');
    await user.type(screen.getByLabelText('Description'), 'Albums to explore.');
    await user.click(screen.getByRole('button', { name: 'Add collection' }));

    expect(createCollection).toHaveBeenCalledWith({
      title: 'Classic rock guide',
      source: 'anontraveler',
      sourceUrl: 'https://example.test/rank/version/1',
      description: 'Albums to explore.',
      collectionType: 'album_rank',
    });
    await waitFor(() => expect(loadCollections).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Archive collection added.')).toBeInTheDocument();
  });

  it('previews an Anontraveler collection URL and imports it with custom title and description', async () => {
    const user = userEvent.setup();
    const loadCollections = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(collections);
    const previewAnontraveler = vi.fn().mockResolvedValue(anontravelerPreview);
    const mapPreviewCandidates = vi.fn().mockReturnValue(previewCandidates);
    const saveCandidatesDraft = vi.fn().mockResolvedValue({ importJobId: 'job-1', savedCount: 1 });
    const createReviewPlan = vi.fn().mockResolvedValue({
      plannedCount: 6,
      plannedCounts: {
        artist: 1,
        album: 1,
        archive_collection: 1,
        archive_item: 3,
        song: 0,
        media_asset: 0,
      },
      items: [],
    });
    const commitPublicImport = vi.fn().mockResolvedValue({ createdCount: 4, matchedCount: 1, skippedCount: 0 });

    renderWithI18n(
      <ArchivePage
        onLoadCollections={loadCollections}
        onLoadImportRole={async () => 'admin'}
        onPreviewAnontraveler={previewAnontraveler}
        onMapAnontravelerPreviewCandidates={mapPreviewCandidates}
        onSaveCandidatesDraft={saveCandidatesDraft}
        onCreateReviewPlan={createReviewPlan}
        onCommitPublicImportReviewPlan={commitPublicImport}
      />,
    );

    await user.type(await screen.findByLabelText('Anontraveler rank URL'), anontravelerPreview.sourceUrl);
    await user.click(screen.getByRole('button', { name: 'Preview collection' }));

    expect(previewAnontraveler).toHaveBeenCalledWith(anontravelerPreview.sourceUrl);
    expect(await screen.findByDisplayValue('Preview collection title')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Preview collection description.')).toBeInTheDocument();
    expect(screen.getByText('4 archive items')).toBeInTheDocument();
    expect(screen.getByText('4 albums')).toBeInTheDocument();
    expect(screen.getByText('2 skipped songs')).toBeInTheDocument();
    expect(screen.getByText('Album one')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Album one cover' })).toHaveAttribute(
      'src',
      'https://img.example.test/album-one.jpg',
    );
    expect(screen.getByText('[ 2001 ]')).toBeInTheDocument();
    expect(screen.getByText('Album three')).toBeInTheDocument();
    expect(screen.queryByText('Album four')).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Custom archive title');
    await user.clear(screen.getByLabelText('Description'));
    await user.type(screen.getByLabelText('Description'), 'Custom archive description.');
    await user.click(screen.getByRole('button', { name: 'Import collection' }));

    expect(mapPreviewCandidates).toHaveBeenCalledWith(anontravelerPreview);
    expect(saveCandidatesDraft).toHaveBeenCalledWith({
      sourceName: 'anontraveler',
      query: anontravelerPreview.sourceUrl,
      candidates: previewCandidates,
    });
    expect(createReviewPlan).toHaveBeenCalledWith({
      importJobId: 'job-1',
      sourceName: 'anontraveler',
      sourceUrl: anontravelerPreview.sourceUrl,
      candidates: previewCandidates,
      archiveCollection: {
        externalId: 'version-1',
        title: 'Custom archive title',
        description: 'Custom archive description.',
        collectionType: 'album_rank',
      },
      archiveItems: anontravelerPreview.archiveItems,
    });
    expect(commitPublicImport).toHaveBeenCalled();
    await waitFor(() => expect(loadCollections).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Import finished: 4 created, 1 matched, 0 skipped.')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Import summary: preview 4 archive items, saved 1 candidates, planned 6 review items, committed 5 rows. Planned breakdown: artists 1, albums 1, archive collections 1, archive items 3, songs 0, media assets 0.',
      ),
    ).toBeInTheDocument();
  });

  it('scans the Anontraveler directory and fills the URL without previewing or importing', async () => {
    const user = userEvent.setup();
    const scanRankDirectoryPage = vi.fn().mockResolvedValue(rankDirectoryPage(rankDirectoryItems, 0, 2, false));
    const previewAnontraveler = vi.fn().mockResolvedValue(anontravelerPreview);
    const saveCandidatesDraft = vi.fn().mockResolvedValue({ importJobId: 'job-1', savedCount: 1 });
    const createReviewPlan = vi.fn().mockResolvedValue({ plannedCount: 6, items: [] });
    const commitPublicImport = vi.fn().mockResolvedValue({ createdCount: 4, matchedCount: 1, skippedCount: 0 });

    renderWithI18n(
      <ArchivePage
        onLoadCollections={vi.fn().mockResolvedValue([])}
        onScanAnontravelerRankDirectoryPage={scanRankDirectoryPage}
        onPreviewAnontraveler={previewAnontraveler}
        onSaveCandidatesDraft={saveCandidatesDraft}
        onCreateReviewPlan={createReviewPlan}
        onCommitPublicImportReviewPlan={commitPublicImport}
      />,
    );

    await user.click(await screen.findByRole('button', { name: 'Scan Anontraveler directory' }));

    expect(scanRankDirectoryPage).toHaveBeenCalledWith(0);
    expect(await screen.findByText('Classic rock guide')).toBeInTheDocument();
    expect(screen.getByText('496 items')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('Imported guide')).toBeInTheDocument();
    expect(screen.getByText('Unknown count')).toBeInTheDocument();
    expect(screen.getByText('imported')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Search ranks'), 'Imported');
    expect(screen.queryByText('Classic rock guide')).not.toBeInTheDocument();
    expect(screen.getByText('Imported guide')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Search ranks'));

    await user.click(screen.getByRole('button', { name: 'Select Classic rock guide' }));

    expect(screen.getByLabelText('Anontraveler rank URL')).toHaveValue(
      'https://www.anontraveler.com/rank/version/version-1',
    );
    expect(previewAnontraveler).not.toHaveBeenCalled();
    expect(screen.queryByDisplayValue('Preview collection title')).not.toBeInTheDocument();
    expect(saveCandidatesDraft).not.toHaveBeenCalled();
    expect(createReviewPlan).not.toHaveBeenCalled();
    expect(commitPublicImport).not.toHaveBeenCalled();
  });

  it('loads more Anontraveler directory pages and deduplicates ranks', async () => {
    const user = userEvent.setup();
    const scanRankDirectoryPage = vi
      .fn()
      .mockResolvedValueOnce(rankDirectoryPage(rankDirectoryItems.slice(0, 1), 0, 3, true))
      .mockResolvedValueOnce(rankDirectoryPage([rankDirectoryItems[0], rankDirectoryItems[1]], 1, 3, false));
    const previewAnontraveler = vi.fn().mockResolvedValue(anontravelerPreview);
    const saveCandidatesDraft = vi.fn().mockResolvedValue({ importJobId: 'job-1', savedCount: 1 });
    const createReviewPlan = vi.fn().mockResolvedValue({ plannedCount: 6, items: [] });
    const commitPublicImport = vi.fn().mockResolvedValue({ createdCount: 4, matchedCount: 1, skippedCount: 0 });

    renderWithI18n(
      <ArchivePage
        onLoadCollections={vi.fn().mockResolvedValue([])}
        onScanAnontravelerRankDirectoryPage={scanRankDirectoryPage}
        onPreviewAnontraveler={previewAnontraveler}
        onSaveCandidatesDraft={saveCandidatesDraft}
        onCreateReviewPlan={createReviewPlan}
        onCommitPublicImportReviewPlan={commitPublicImport}
      />,
    );

    await user.click(await screen.findByRole('button', { name: 'Scan Anontraveler directory' }));

    expect(scanRankDirectoryPage).toHaveBeenCalledWith(0);
    expect(await screen.findByText('Classic rock guide')).toBeInTheDocument();
    expect(screen.queryByText('Imported guide')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load more ranks' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Load more ranks' }));

    expect(scanRankDirectoryPage).toHaveBeenCalledWith(1);
    expect(await screen.findByText('Imported guide')).toBeInTheDocument();
    expect(screen.getAllByText('Classic rock guide')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Load more ranks' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Select Imported guide' }));

    expect(screen.getByLabelText('Anontraveler rank URL')).toHaveValue(
      'https://www.anontraveler.com/rank/version/version-2',
    );
    expect(previewAnontraveler).not.toHaveBeenCalled();
    expect(screen.queryByDisplayValue('Preview collection title')).not.toBeInTheDocument();
    expect(saveCandidatesDraft).not.toHaveBeenCalled();
    expect(createReviewPlan).not.toHaveBeenCalled();
    expect(commitPublicImport).not.toHaveBeenCalled();
  });

  it('edits an archive collection and refreshes the list', async () => {
    const user = userEvent.setup();
    const loadCollections = vi.fn().mockResolvedValue(collections);
    const updateCollection = vi.fn().mockResolvedValue(undefined);

    renderWithI18n(
      <ArchivePage
        onLoadCollections={loadCollections}
        onLoadImportRole={async () => 'admin'}
        onUpdateCollection={updateCollection}
      />,
    );

    await screen.findByText('Classic rock guide');
    await user.click(screen.getByText('Classic rock guide'));
    await user.click(screen.getByRole('button', { name: 'Edit Classic rock guide' }));
    expect(screen.getByText('Collection / edit')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Updated classic rock guide');
    await user.clear(screen.getByLabelText('Description'));
    await user.type(screen.getByLabelText('Description'), 'Updated albums to explore.');
    await user.click(screen.getByRole('button', { name: 'Update collection' }));

    expect(updateCollection).toHaveBeenCalledWith('collection-1', {
      title: 'Updated classic rock guide',
      source: 'anontraveler',
      sourceUrl: 'https://example.test/rank/version/1',
      description: 'Updated albums to explore.',
      collectionType: 'album_rank',
    });
    await waitFor(() => expect(loadCollections).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Archive collection updated.')).toBeInTheDocument();
  });

  it('deletes an archive collection and refreshes the list', async () => {
    const user = userEvent.setup();
    const loadCollections = vi.fn().mockResolvedValueOnce(collections).mockResolvedValueOnce([]);
    const deleteCollection = vi.fn().mockResolvedValue(undefined);

    renderWithI18n(
      <ArchivePage
        onDeleteCollection={deleteCollection}
        onLoadCollections={loadCollections}
        onLoadImportRole={async () => 'admin'}
      />,
    );

    await screen.findByText('Classic rock guide');
    await user.click(screen.getByText('Classic rock guide'));
    await user.click(screen.getByRole('button', { name: 'Delete Classic rock guide' }));

    expect(deleteCollection).toHaveBeenCalledWith('collection-1');
    await waitFor(() => expect(loadCollections).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Archive collection deleted.')).toBeInTheDocument();
  });
});
