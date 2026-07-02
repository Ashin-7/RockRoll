import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { LibraryPage } from './LibraryPage';
import { MediaAssetSummary } from './media.types';

const mediaAssets: MediaAssetSummary[] = [
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
];

describe('LibraryPage', () => {
  it('renders media categories', () => {
    renderWithI18n(<LibraryPage />);

    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Videos')).toBeInTheDocument();
    expect(screen.getByText('Scores')).toBeInTheDocument();
    expect(screen.getByText('Audio')).toBeInTheDocument();
  });

  it('loads and renders media assets', async () => {
    renderWithI18n(<LibraryPage onLoadMediaAssets={vi.fn().mockResolvedValue(mediaAssets)} />);

    expect(screen.getByText('Loading media assets...')).toBeInTheDocument();
    expect(await screen.findByText('solo-take.mp4')).toBeInTheDocument();
    const assetCard = screen.getByText('solo-take.mp4').closest('article');
    expect(assetCard).not.toBeNull();
    expect(within(assetCard as HTMLElement).getByText('video')).toBeInTheDocument();
    expect(within(assetCard as HTMLElement).getByText('song: song-1')).toBeInTheDocument();
  });

  it('creates a media asset with an album link and refreshes the list', async () => {
    const user = userEvent.setup();
    const loadMediaAssets = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(mediaAssets);
    const createMediaAsset = vi.fn().mockResolvedValue(undefined);

    renderWithI18n(<LibraryPage onCreateMediaAsset={createMediaAsset} onLoadMediaAssets={loadMediaAssets} />);

    await user.type(await screen.findByLabelText('File name'), 'album-cover.jpg');
    await user.selectOptions(screen.getByLabelText('Media type'), 'image');
    await user.type(screen.getByLabelText('Storage bucket'), 'covers');
    await user.type(screen.getByLabelText('Storage path or URL'), 'covers/album-cover.jpg');
    await user.type(screen.getByLabelText('Notes'), 'Cover reference.');
    await user.selectOptions(screen.getByLabelText('Linked entity type'), 'album');
    await user.type(screen.getByLabelText('Linked entity ID'), 'album-1');
    await user.click(screen.getByRole('button', { name: 'Add media asset' }));

    expect(createMediaAsset).toHaveBeenCalledWith({
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
    await waitFor(() => expect(loadMediaAssets).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Media asset added.')).toBeInTheDocument();
  });
});
