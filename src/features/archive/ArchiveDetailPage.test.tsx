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
    expect(screen.getByText('No cover')).toBeInTheDocument();
    expect(screen.getByText('Showing 1-1 of 1 items')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('renders archive items with imported album metadata and paginates the index', async () => {
    const user = userEvent.setup();
    const pagedCollection: ArchiveCollectionDetail = {
      ...collection,
      items: Array.from({ length: 26 }, (_, index) => ({
        ...collection.items[0],
        id: `item-${index + 1}`,
        entityId: `album-${index + 1}`,
        displayTitle: index === 25 ? 'Hidden page album' : `Album ${index + 1}`,
        position: index + 1,
        albumMetadata: {
          coverUrl: 'https://img.example.test/please-please-me.jpg',
          releaseYear: 1963,
          styles: ['Beat music', 'Rock'],
          note: 'Original preview comment.',
        },
      })),
    };

    renderWithI18n(
      <ArchiveDetailPage archiveId="collection-1" onLoadCollection={vi.fn().mockResolvedValue(pagedCollection)} />,
    );

    expect(await screen.findByText('Album 1')).toBeInTheDocument();
    expect(screen.getByAltText('Album 1 cover')).toBeInTheDocument();
    expect(screen.getAllByText('1963')).toHaveLength(25);
    expect(screen.getAllByText('Beat music')).toHaveLength(25);
    expect(screen.getAllByText('Rock')).toHaveLength(25);
    expect(screen.getAllByText('Original preview comment.')).toHaveLength(25);
    expect(screen.getByText('Showing 1-25 of 26 items')).toBeInTheDocument();
    expect(screen.queryByText('Hidden page album')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next page' }));

    expect(screen.getByText('Hidden page album')).toBeInTheDocument();
    expect(screen.getByText('Showing 26-26 of 26 items')).toBeInTheDocument();
    expect(screen.queryByText('Album 1')).not.toBeInTheDocument();
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

  it('edits an archive item and reloads the collection', async () => {
    const user = userEvent.setup();
    const onUpdateItem = vi.fn().mockResolvedValue(undefined);
    const onLoadCollection = vi.fn().mockResolvedValue(collection);

    renderWithI18n(
      <ArchiveDetailPage
        archiveId="collection-1"
        onLoadCollection={onLoadCollection}
        onUpdateItem={onUpdateItem}
      />,
    );

    expect(await screen.findByText('Please Please Me')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.getByText('Edit album item')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Display title'));
    await user.type(screen.getByLabelText('Display title'), 'With the Beatles');
    await user.clear(screen.getByLabelText('Position'));
    await user.type(screen.getByLabelText('Position'), '2');
    await user.clear(screen.getByLabelText('Note'));
    await user.type(screen.getByLabelText('Note'), 'Updated marker.');
    await user.click(screen.getByRole('button', { name: 'Update album item' }));

    expect(onUpdateItem).toHaveBeenCalledWith({
      itemId: 'item-1',
      entityType: 'album',
      entityId: 'album-1',
      displayTitle: 'With the Beatles',
      position: 2,
      note: 'Updated marker.',
      externalSource: 'anontraveler',
      externalId: 'external-item-1',
    });
    await waitFor(() => expect(onLoadCollection).toHaveBeenCalledTimes(2));
  });

  it('deletes an archive item and reloads the collection', async () => {
    const user = userEvent.setup();
    const onDeleteItem = vi.fn().mockResolvedValue(undefined);
    const onLoadCollection = vi.fn().mockResolvedValue(collection);

    renderWithI18n(
      <ArchiveDetailPage
        archiveId="collection-1"
        onDeleteItem={onDeleteItem}
        onLoadCollection={onLoadCollection}
      />,
    );

    expect(await screen.findByText('Please Please Me')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onDeleteItem).toHaveBeenCalledWith('item-1');
    await waitFor(() => expect(onLoadCollection).toHaveBeenCalledTimes(2));
  });
});
