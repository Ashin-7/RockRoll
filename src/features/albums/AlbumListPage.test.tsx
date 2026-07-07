import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { AlbumListPage } from './AlbumListPage';
import { AlbumCollectionOption, AlbumCollectionSummary, AlbumSummary } from './album.types';

const albums: AlbumSummary[] = [
  {
    id: 'album-1',
    title: 'Axis: Bold as Love',
    artistName: 'Jimi Hendrix',
    releaseYear: 1967,
    albumType: 'album',
    notes: 'Second studio album.',
  },
];

const albumCollections: AlbumCollectionSummary[] = [
  {
    id: 'collection-1',
    title: 'Classic rock guide',
    source: 'anontraveler',
    sourceUrl: 'https://example.test/rank/version/1',
    description: 'Albums to explore.',
    albums: [
      {
        id: 'album-1',
        title: 'Axis: Bold as Love',
        artistName: 'Jimi Hendrix',
        releaseYear: 1967,
        albumType: 'album',
        notes: 'Second studio album.',
        rank: 7,
        coverUrl: 'https://img.example.test/axis.jpg',
        styles: ['Psychedelic rock', 'Blues rock'],
        reviewNote: 'Essential guitar record.',
      },
    ],
  },
];

const albumCollectionOptions: AlbumCollectionOption[] = albumCollections.map(({ albums: _albums, ...collection }) => collection);

describe('AlbumListPage', () => {
  it('loads collection titles first and then loads the selected collection albums', async () => {
    const onLoadAlbumCollectionOptions = vi.fn().mockResolvedValue(albumCollectionOptions);
    const onLoadAlbumCollection = vi.fn().mockResolvedValue(albumCollections[0]);

    renderWithI18n(
      <AlbumListPage
        onLoadAlbumCollectionOptions={onLoadAlbumCollectionOptions}
        onLoadAlbumCollection={onLoadAlbumCollection}
      />,
    );

    expect(await screen.findByLabelText('Collection category')).toBeInTheDocument();
    expect(onLoadAlbumCollectionOptions).toHaveBeenCalledTimes(1);
    expect(onLoadAlbumCollection).toHaveBeenCalledWith('collection-1', { pageIndex: 0, pageSize: 25 });
    expect(await screen.findByText('Axis: Bold as Love')).toBeInTheDocument();
  });

  it('loads and renders albums grouped by import collection', async () => {
    renderWithI18n(<AlbumListPage onLoadAlbumCollections={vi.fn().mockResolvedValue(albumCollections)} />);

    expect(screen.getByText('Loading albums...')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Classic rock guide' })).toBeInTheDocument();
    expect(await screen.findByText('Axis: Bold as Love')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Axis: Bold as Love' })).toHaveAttribute('href', '#album/album-1');
    expect(screen.getByText('Jimi Hendrix')).toBeInTheDocument();
    expect(screen.getByAltText('Axis: Bold as Love cover')).toBeInTheDocument();
    expect(screen.getByText('#7')).toBeInTheDocument();
    expect(screen.getByText('1967')).toBeInTheDocument();
    expect(screen.getAllByText('Psychedelic rock')).toHaveLength(2);
    expect(screen.getAllByText('Blues rock')).toHaveLength(2);
    expect(screen.getByText('Essential guitar record.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open source link' })).toHaveAttribute(
      'href',
      'https://example.test/rank/version/1',
    );
  });

  it('hides manual album creation and points users to link import', async () => {
    renderWithI18n(<AlbumListPage onLoadAlbumCollections={vi.fn().mockResolvedValue([])} />);

    expect(await screen.findByText('No album import collections yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add album' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
    expect(screen.queryByText('Albums are added through import links from the inbox.')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open import inbox' })).not.toBeInTheDocument();
  });

  it('renders empty state when no albums exist', async () => {
    renderWithI18n(<AlbumListPage onLoadAlbumCollections={vi.fn().mockResolvedValue([])} />);

    expect(await screen.findByText('No album import collections yet.')).toBeInTheDocument();
  });

  it('filters album collections by style', async () => {
    const user = userEvent.setup();
    const collections: AlbumCollectionSummary[] = [
      ...albumCollections,
      {
        id: 'collection-2',
        title: 'Folk essentials',
        source: 'anontraveler',
        sourceUrl: '',
        description: '',
        albums: [
          {
            ...albumCollections[0].albums[0],
            id: 'album-2',
            title: 'Blue',
            artistName: 'Joni Mitchell',
            rank: 1,
            coverUrl: '',
            styles: ['Folk'],
          },
        ],
      },
    ];

    renderWithI18n(<AlbumListPage onLoadAlbumCollections={vi.fn().mockResolvedValue(collections)} />);

    expect(await screen.findByText('Axis: Bold as Love')).toBeInTheDocument();
    expect(screen.getByText('Blue')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Filter by style'), 'Folk');

    expect(screen.queryByText('Axis: Bold as Love')).not.toBeInTheDocument();
    expect(screen.getByText('Blue')).toBeInTheDocument();
  });

  it('paginates albums inside an import collection without changing source ranking', async () => {
    const user = userEvent.setup();
    const pagedCollection: AlbumCollectionSummary = {
      ...albumCollections[0],
      albums: Array.from({ length: 26 }, (_, index) => ({
        ...albumCollections[0].albums[0],
        id: `album-${index + 1}`,
        title: index === 25 ? 'Album 26' : `Album ${index + 1}`,
        rank: index + 1,
      })),
    };

    renderWithI18n(<AlbumListPage onLoadAlbumCollections={vi.fn().mockResolvedValue([pagedCollection])} />);

    expect(await screen.findByText('Album 1')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('Showing 1-25 of 26 albums')).toBeInTheDocument();
    expect(screen.queryByText('Album 26')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next page' }));

    expect(screen.getByText('Album 26')).toBeInTheDocument();
    expect(screen.getByText('#26')).toBeInTheDocument();
    expect(screen.getByText('Showing 26-26 of 26 albums')).toBeInTheDocument();
    expect(screen.queryByText('Album 1')).not.toBeInTheDocument();
  });

  it('loads the next collection page from the service when using collection options', async () => {
    const user = userEvent.setup();
    const firstPage: AlbumCollectionSummary = {
      ...albumCollections[0],
      totalAlbumCount: 26,
      albums: Array.from({ length: 25 }, (_, index) => ({
        ...albumCollections[0].albums[0],
        id: `album-${index + 1}`,
        title: `Album ${index + 1}`,
        rank: index + 1,
      })),
    };
    const secondPage: AlbumCollectionSummary = {
      ...albumCollections[0],
      totalAlbumCount: 26,
      albums: [{
        ...albumCollections[0].albums[0],
        id: 'album-26',
        title: 'Album 26',
        rank: 26,
      }],
    };
    const onLoadAlbumCollection = vi.fn()
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage);

    renderWithI18n(
      <AlbumListPage
        onLoadAlbumCollectionOptions={vi.fn().mockResolvedValue(albumCollectionOptions)}
        onLoadAlbumCollection={onLoadAlbumCollection}
      />,
    );

    expect(await screen.findByText('Album 1')).toBeInTheDocument();
    expect(screen.getByText('Showing 1-25 of 26 albums')).toBeInTheDocument();
    expect(screen.queryByText('Album 26')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next page' }));

    expect(onLoadAlbumCollection).toHaveBeenLastCalledWith('collection-1', { pageIndex: 1, pageSize: 25 });
    expect(await screen.findByText('Album 26')).toBeInTheDocument();
    expect(screen.getByText('Showing 26-26 of 26 albums')).toBeInTheDocument();
  });

  it('places collection pagination after the album list', async () => {
    const pagedCollection: AlbumCollectionSummary = {
      ...albumCollections[0],
      albums: Array.from({ length: 26 }, (_, index) => ({
        ...albumCollections[0].albums[0],
        id: `album-${index + 1}`,
        title: `Album ${index + 1}`,
        rank: index + 1,
      })),
    };

    renderWithI18n(<AlbumListPage onLoadAlbumCollections={vi.fn().mockResolvedValue([pagedCollection])} />);

    const firstAlbum = await screen.findByText('Album 1');
    const nextPageButton = screen.getByRole('button', { name: 'Next page' });

    expect(
      firstAlbum.compareDocumentPosition(nextPageButton) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('expands and collapses long collection descriptions', async () => {
    const user = userEvent.setup();
    const collectionWithLongDescription: AlbumCollectionSummary = {
      ...albumCollections[0],
      description: 'A long collection description that explains why this canon exists and how the ranking should be read.',
    };

    renderWithI18n(<AlbumListPage onLoadAlbumCollections={vi.fn().mockResolvedValue([collectionWithLongDescription])} />);

    const toggle = await screen.findByRole('button', { name: 'Show full description' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Collapse description' })).toBeInTheDocument();
  });

  it('expands and collapses album notes from the text itself', async () => {
    const user = userEvent.setup();

    renderWithI18n(<AlbumListPage onLoadAlbumCollections={vi.fn().mockResolvedValue(albumCollections)} />);

    const noteToggle = await screen.findByRole('button', { name: 'Essential guitar record.' });
    expect(noteToggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(noteToggle);

    expect(noteToggle).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('AlbumListPage legacy props', () => {
  it('can still render provided flat albums as an ungrouped collection', async () => {
    const user = userEvent.setup();

    renderWithI18n(<AlbumListPage albums={albums} />);

    expect(await screen.findByText('Ungrouped albums')).toBeInTheDocument();
    expect(screen.getByText('Axis: Bold as Love')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Filter by style'), 'All styles');
    expect(screen.getByText('Axis: Bold as Love')).toBeInTheDocument();
  });
});
