import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { ArchiveDetailPage } from './ArchiveDetailPage';
import { ArchiveCollectionDetail } from './archive.types';

const collection: ArchiveCollectionDetail = {
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
};

describe('ArchiveDetailPage', () => {
  it('loads and renders archive collection details', async () => {
    renderWithI18n(
      <ArchiveDetailPage archiveId="collection-1" onLoadCollection={vi.fn().mockResolvedValue(collection)} />,
    );

    expect(screen.getByText('Loading archive collection...')).toBeInTheDocument();
    expect(await screen.findByText('Classic rock guide')).toBeInTheDocument();
    expect(screen.getByText('Albums to explore.')).toBeInTheDocument();
    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(screen.getByText('Items filed')).toBeInTheDocument();
    expect(screen.getByText('Source URL')).toBeInTheDocument();
    expect(screen.getByText('Please Please Me')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('Beat music marker.')).toBeInTheDocument();
    expect(screen.getByText('Item')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Position' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Note' })).toBeInTheDocument();
  });

  it('adds an album item and reloads the collection', async () => {
    const user = userEvent.setup();
    const onAddItem = vi.fn().mockResolvedValue(undefined);
    const onLoadCollection = vi.fn().mockResolvedValueOnce({ ...collection, items: [] }).mockResolvedValueOnce(collection);

    renderWithI18n(
      <ArchiveDetailPage archiveId="collection-1" onAddItem={onAddItem} onLoadCollection={onLoadCollection} />,
    );

    expect(await screen.findByText('Classic rock guide')).toBeInTheDocument();
    expect(screen.getByText('Item / album')).toBeInTheDocument();
    expect(screen.getByText('Album link')).toBeInTheDocument();
    expect(screen.getByText('Placement')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Album ID'), 'album-1');
    await user.type(screen.getByLabelText('Display title'), 'Please Please Me');
    await user.type(screen.getByLabelText('Position'), '1');
    await user.type(screen.getByLabelText('Note'), 'Beat music marker.');
    await user.click(screen.getByRole('button', { name: 'Add album item' }));

    expect(onAddItem).toHaveBeenCalledWith({
      collectionId: 'collection-1',
      entityType: 'album',
      entityId: 'album-1',
      displayTitle: 'Please Please Me',
      position: 1,
      note: 'Beat music marker.',
      externalSource: null,
      externalId: null,
    });
    await waitFor(() => expect(onLoadCollection).toHaveBeenCalledTimes(2));
  });
});
