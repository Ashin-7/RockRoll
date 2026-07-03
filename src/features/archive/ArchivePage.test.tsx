import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { ArchivePage } from './ArchivePage';
import { ArchiveCollectionSummary } from './archive.types';

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

describe('ArchivePage', () => {
  it('renders archive sections', () => {
    renderWithI18n(<ArchivePage />);

    expect(screen.getByText('Music Archive')).toBeInTheDocument();
    expect(screen.getByText('Artists')).toBeInTheDocument();
    expect(screen.getByText('Albums')).toBeInTheDocument();
    expect(screen.getByText('Genres')).toBeInTheDocument();
    expect(screen.getByText('Collection / create')).toBeInTheDocument();
    expect(screen.getByText('Identity')).toBeInTheDocument();
    expect(screen.getByText('Source profile')).toBeInTheDocument();
  });

  it('loads and renders archive collections', async () => {
    renderWithI18n(<ArchivePage onLoadCollections={async () => collections} />);

    expect(screen.getByText('Loading archive collections...')).toBeInTheDocument();
    expect(await screen.findByText('Classic rock guide')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Classic rock guide' })).toHaveAttribute(
      'href',
      '#archive/collection-1',
    );
    expect(screen.getByText('anontraveler')).toBeInTheDocument();
    expect(screen.getByText('Collection')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Source' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Type' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
  });

  it('creates an archive collection and refreshes the list', async () => {
    const user = userEvent.setup();
    const loadCollections = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(collections);
    const createCollection = vi.fn().mockResolvedValue(undefined);

    renderWithI18n(<ArchivePage onCreateCollection={createCollection} onLoadCollections={loadCollections} />);

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

  it('edits an archive collection and refreshes the list', async () => {
    const user = userEvent.setup();
    const loadCollections = vi.fn().mockResolvedValue(collections);
    const updateCollection = vi.fn().mockResolvedValue(undefined);

    renderWithI18n(<ArchivePage onLoadCollections={loadCollections} onUpdateCollection={updateCollection} />);

    await screen.findByText('Classic rock guide');
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

    renderWithI18n(<ArchivePage onDeleteCollection={deleteCollection} onLoadCollections={loadCollections} />);

    await screen.findByText('Classic rock guide');
    await user.click(screen.getByRole('button', { name: 'Delete Classic rock guide' }));

    expect(deleteCollection).toHaveBeenCalledWith('collection-1');
    await waitFor(() => expect(loadCollections).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Archive collection deleted.')).toBeInTheDocument();
  });
});
