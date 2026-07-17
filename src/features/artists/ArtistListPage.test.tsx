import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { ArtistListPage } from './ArtistListPage';
import { ArtistSummary } from './artist.types';

const realArtists: ArtistSummary[] = [
  {
    id: 'artist-1',
    name: 'Jimi Hendrix',
    country: 'US',
    beginYear: 1942,
    endYear: 1970,
    notes: 'Electric blues vocabulary.',
  },
];

describe('ArtistListPage', () => {
  it('loads and renders artists from the provided loader', async () => {
    renderWithI18n(<ArtistListPage onLoadArtists={vi.fn().mockResolvedValue(realArtists)} />);

    expect(screen.getByText('Loading artists...')).toBeInTheDocument();
    expect(await screen.findByText('Jimi Hendrix')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Artist' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Country' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Activity' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Jimi Hendrix' })).toHaveAttribute('href', '#artist/artist-1');
    expect(screen.getByText('US')).toBeInTheDocument();
    expect(screen.getByText('1942-1970')).toBeInTheDocument();
    expect(screen.getByText('Electric blues vocabulary.')).toBeInTheDocument();
  });

  it('renders empty state when no artists exist', async () => {
    renderWithI18n(<ArtistListPage onLoadArtists={vi.fn().mockResolvedValue([])} />);

    expect(await screen.findByText('No artists in the archive yet.')).toBeInTheDocument();
  });

  it('renders an error state when artists cannot load', async () => {
    renderWithI18n(<ArtistListPage onLoadArtists={vi.fn().mockRejectedValue(new Error('network failed'))} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('network failed');
  });

  it('creates an artist and refreshes the list', async () => {
    const loadArtists = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(realArtists);
    const createArtist = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithI18n(<ArtistListPage onCreateArtist={createArtist} onLoadArtists={loadArtists} />);

    expect(await screen.findByRole('heading', { name: 'Identity' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Archive notes' })).toBeInTheDocument();

    await user.type(await screen.findByLabelText('Name'), 'Jimi Hendrix');
    await user.type(screen.getByLabelText('Country'), 'US');
    await user.type(screen.getByLabelText('Begin year'), '1942');
    await user.type(screen.getByLabelText('Notes'), 'Electric blues vocabulary.');
    await user.click(screen.getByRole('button', { name: 'Add artist' }));

    expect(createArtist).toHaveBeenCalledWith({
      name: 'Jimi Hendrix',
      country: 'US',
      beginYear: 1942,
      notes: 'Electric blues vocabulary.',
    });
    await waitFor(() => expect(loadArtists).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Artist added.')).toBeInTheDocument();
    expect(screen.getByText('Jimi Hendrix')).toBeInTheDocument();
  });

  it('renders Chinese add-artist messages', () => {
    window.localStorage.setItem('rockroll.locale', 'zh-CN');

    renderWithI18n(<ArtistListPage artists={[]} />);

    expect(screen.getByRole('heading', { name: '新增艺人' })).toBeInTheDocument();
    expect(screen.getByLabelText('名称')).toBeInTheDocument();
  });
});
