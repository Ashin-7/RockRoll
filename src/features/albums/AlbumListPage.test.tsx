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
  it('renders the album hero and total with shared display primitives', () => {
    const { container } = renderWithI18n(<AlbumListPage albums={albums} />);

    expect(container.querySelector('header.albums-hero.ui-panel--hero')).toBeInTheDocument();
    expect(container.querySelector('.albums-hero__heading')).toBeInTheDocument();
    expect(container.querySelector('aside.albums-hero__note')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Best Metal Albums Top 1' })).toBeInTheDocument();
    expect(screen.getByText('2025 版')).toBeInTheDocument();
  });

  it('searches collection categories in the trigger input and selects from a floating list', async () => {
    const user = userEvent.setup();
    const secondCollection: AlbumCollectionSummary = {
      ...albumCollections[0],
      id: 'collection-2',
      title: 'Folk essentials',
      albums: [{
        ...albumCollections[0].albums[0],
        id: 'album-2',
        title: 'Blue',
        artistName: 'Joni Mitchell',
      }],
    };
    const options = [albumCollections[0], secondCollection].map(({ albums: _albums, ...collection }) => collection);
    const onLoadAlbumCollection = vi.fn()
      .mockResolvedValueOnce(albumCollections[0])
      .mockResolvedValueOnce(secondCollection);

    renderWithI18n(
      <AlbumListPage
        onLoadAlbumCollectionOptions={vi.fn().mockResolvedValue(options)}
        onLoadAlbumCollection={onLoadAlbumCollection}
      />,
    );

    const collectionFilter = await screen.findByRole('searchbox', { name: 'Collection category' });
    expect(collectionFilter).toHaveValue('Classic rock guide');
    expect(screen.queryByRole('button', { name: 'Folk essentials' })).not.toBeInTheDocument();

    await user.click(collectionFilter);
    expect(collectionFilter).toHaveValue('');

    expect(screen.getByRole('button', { name: 'Classic rock guide' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Folk essentials' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Classic rock guide' })).toHaveClass('ui-button-unstyled');

    await user.type(collectionFilter, 'folk');

    expect(screen.queryByRole('button', { name: 'Classic rock guide' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Folk essentials' })).toBeInTheDocument();

    await user.clear(collectionFilter);
    expect(screen.queryByRole('button', { name: 'Move Folk essentials up' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Move Folk essentials down' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Folk essentials' }));

    expect(onLoadAlbumCollection).toHaveBeenLastCalledWith('collection-2', { pageIndex: 0, pageSize: 25 });
    expect(await screen.findByText('Blue')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Collection category' })).toHaveValue('Folk essentials');
    expect(screen.queryByRole('button', { name: 'Classic rock guide' })).not.toBeInTheDocument();
  });

  it('searches existing style options before applying a style filter', async () => {
    const user = userEvent.setup();
    const collectionWithStyles: AlbumCollectionSummary = {
      ...albumCollections[0],
      availableStyles: ['Blues rock', 'Folk', 'Psychedelic rock'],
    };
    const folkCollection: AlbumCollectionSummary = {
      ...collectionWithStyles,
      albums: [{
        ...albumCollections[0].albums[0],
        id: 'album-2',
        title: 'Blue',
        artistName: 'Joni Mitchell',
        styles: ['Folk'],
      }],
    };
    const onLoadAlbumCollection = vi.fn()
      .mockResolvedValueOnce(collectionWithStyles)
      .mockResolvedValueOnce(folkCollection);

    renderWithI18n(
      <AlbumListPage
        onLoadAlbumCollectionOptions={vi.fn().mockResolvedValue(albumCollectionOptions)}
        onLoadAlbumCollection={onLoadAlbumCollection}
      />,
    );

    const styleFilter = await screen.findByRole('searchbox', { name: 'Filter by style' });
    expect(styleFilter).toHaveValue('All styles');
    expect(screen.queryByRole('button', { name: 'Psychedelic rock' })).not.toBeInTheDocument();

    await user.click(styleFilter);
    expect(styleFilter).toHaveValue('');

    expect(screen.getByRole('button', { name: 'Psychedelic rock' })).toBeInTheDocument();

    await user.type(styleFilter, 'folk');

    expect(screen.queryByRole('button', { name: 'Blues rock' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Folk' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Folk' }));

    expect(onLoadAlbumCollection).toHaveBeenLastCalledWith('collection-1', { pageIndex: 0, pageSize: 25, style: 'Folk' });
    expect(await screen.findByText('Blue')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Filter by style' })).toHaveValue('Folk');
    expect(screen.queryByRole('button', { name: 'Psychedelic rock' })).not.toBeInTheDocument();
  });

  it('closes filter dropdowns when focus moves outside the toolbar control', async () => {
    const user = userEvent.setup();
    const collectionWithStyles: AlbumCollectionSummary = {
      ...albumCollections[0],
      availableStyles: ['Blues rock', 'Folk', 'Psychedelic rock'],
    };

    renderWithI18n(
      <AlbumListPage
        onLoadAlbumCollectionOptions={vi.fn().mockResolvedValue(albumCollectionOptions)}
        onLoadAlbumCollection={vi.fn().mockResolvedValue(collectionWithStyles)}
      />,
    );

    const styleFilter = await screen.findByRole('searchbox', { name: 'Filter by style' });
    await user.click(styleFilter);
    expect(screen.getByRole('button', { name: 'Psychedelic rock' })).toBeInTheDocument();

    await user.click(screen.getByRole('heading', { name: 'Classic rock guide' }));

    expect(screen.queryByRole('button', { name: 'Psychedelic rock' })).not.toBeInTheDocument();
    expect(styleFilter).toHaveValue('All styles');
  });

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
    const collectionHeading = await screen.findByRole('heading', { name: 'Classic rock guide' });
    const collectionPanel = collectionHeading.closest('section');

    expect(collectionHeading).toBeInTheDocument();
    expect(collectionPanel).toHaveClass('ui-panel', 'ui-panel--card', 'albums-collection');
    expect(await screen.findByText('Axis: Bold as Love')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Axis: Bold as Love' })).toHaveAttribute('href', '#album/album-1');
    expect(screen.getByText('Jimi Hendrix')).toBeInTheDocument();
    expect(screen.getByAltText('Axis: Bold as Love cover')).toBeInTheDocument();
    expect(screen.getByText('07')).toBeInTheDocument();
    expect(screen.getByText('1967')).toBeInTheDocument();
    expect(screen.getAllByText('Psychedelic rock')).toHaveLength(1);
    expect(screen.getAllByText('Blues rock')).toHaveLength(1);
    expect(screen.getByText('Essential guitar record.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open source link' })).not.toBeInTheDocument();
  });

  it('presents the first five records as an editorial wall before the compact chart continues', async () => {
    const wallCollection: AlbumCollectionSummary = {
      ...albumCollections[0],
      albums: Array.from({ length: 6 }, (_, index) => ({
        ...albumCollections[0].albums[0],
        id: `album-${index + 1}`,
        title: `Album ${index + 1}`,
        rank: index + 1,
      })),
    };

    renderWithI18n(<AlbumListPage onLoadAlbumCollections={vi.fn().mockResolvedValue([wallCollection])} />);

    expect((await screen.findByText('Album 1')).closest('article')).toHaveClass('albums-card--feature');
    expect(screen.getByText('Album 3').closest('article')).toHaveClass('albums-card--feature');
    expect(screen.getByText('Album 4').closest('article')).toHaveClass('albums-card--rail');
    expect(screen.getByText('Album 5').closest('article')).toHaveClass('albums-card--rail');
    expect(screen.getByText('Album 6').closest('article')).toHaveClass('albums-card--list');
    expect(screen.getByText('01')).toBeInTheDocument();
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

    await user.click(screen.getByRole('searchbox', { name: 'Filter by style' }));
    await user.click(screen.getByRole('button', { name: 'Folk' }));

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
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('Showing 1-25 of 26 albums')).toBeInTheDocument();
    expect(screen.queryByText('Album 26')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next page' }));

    const album26 = screen.getByText('Album 26');
    expect(album26).toBeInTheDocument();
    expect(album26.closest('article')?.querySelector('.albums-card__rank')).toHaveTextContent('26');
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

  it('filters the selected collection by style through the service instead of the current page only', async () => {
    const user = userEvent.setup();
    const firstPage: AlbumCollectionSummary = {
      ...albumCollections[0],
      totalAlbumCount: 26,
      availableStyles: ['Folk', 'Psychedelic rock'],
      albums: Array.from({ length: 25 }, (_, index) => ({
        ...albumCollections[0].albums[0],
        id: `album-${index + 1}`,
        title: `Album ${index + 1}`,
        rank: index + 1,
        styles: ['Psychedelic rock'],
      })),
    };
    const folkPage: AlbumCollectionSummary = {
      ...albumCollections[0],
      totalAlbumCount: 26,
      availableStyles: ['Folk', 'Psychedelic rock'],
      albums: [{
        ...albumCollections[0].albums[0],
        id: 'album-26',
        title: 'Blue',
        artistName: 'Joni Mitchell',
        rank: 26,
        styles: ['Folk'],
      }],
    };
    const folkSecondPage: AlbumCollectionSummary = {
      ...albumCollections[0],
      totalAlbumCount: 26,
      availableStyles: ['Folk', 'Psychedelic rock'],
      albums: [{
        ...albumCollections[0].albums[0],
        id: 'album-27',
        title: 'Court and Spark',
        artistName: 'Joni Mitchell',
        rank: 27,
        styles: ['Folk'],
      }],
    };
    const onLoadAlbumCollection = vi.fn()
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(folkPage)
      .mockResolvedValueOnce(folkSecondPage);

    renderWithI18n(
      <AlbumListPage
        onLoadAlbumCollectionOptions={vi.fn().mockResolvedValue(albumCollectionOptions)}
        onLoadAlbumCollection={onLoadAlbumCollection}
      />,
    );

    expect(await screen.findByText('Album 1')).toBeInTheDocument();
    await user.click(screen.getByRole('searchbox', { name: 'Filter by style' }));
    await user.click(screen.getByRole('button', { name: 'Folk' }));

    expect(onLoadAlbumCollection).toHaveBeenLastCalledWith('collection-1', { pageIndex: 0, pageSize: 25, style: 'Folk' });
    expect(await screen.findByText('Blue')).toBeInTheDocument();
    expect(screen.getByText('Showing 1-25 of 26 albums')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next page' }));

    expect(onLoadAlbumCollection).toHaveBeenLastCalledWith('collection-1', { pageIndex: 1, pageSize: 25, style: 'Folk' });
    expect(await screen.findByText('Court and Spark')).toBeInTheDocument();
  });

  it('hides the description expand action when the collection description fits', async () => {
    const scrollHeightSpy = vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(48);
    const clientHeightSpy = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(48);
    const collectionWithShortDescription: AlbumCollectionSummary = {
      ...albumCollections[0],
      description: 'A short collection note.',
    };

    renderWithI18n(<AlbumListPage onLoadAlbumCollections={vi.fn().mockResolvedValue([collectionWithShortDescription])} />);

    expect(await screen.findByRole('heading', { name: 'Classic rock guide' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show full description' })).not.toBeInTheDocument();

    scrollHeightSpy.mockRestore();
    clientHeightSpy.mockRestore();
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
    const scrollHeightSpy = vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(96);
    const clientHeightSpy = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(48);
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

    scrollHeightSpy.mockRestore();
    clientHeightSpy.mockRestore();
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
    await user.click(screen.getByRole('searchbox', { name: 'Filter by style' }));
    await user.click(screen.getByRole('button', { name: 'All styles' }));
    expect(screen.getByText('Axis: Bold as Love')).toBeInTheDocument();
  });
});
