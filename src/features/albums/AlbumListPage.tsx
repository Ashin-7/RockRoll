import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { AlbumCollectionOption, AlbumCollectionPageInput, AlbumCollectionSummary, AlbumSummary } from './album.types';
import { getAlbumCollectionById, listAlbumCollectionOptions, listAlbumCollections } from './albums.service';
import './AlbumListPage.css';

const albumPageSize = 25;

interface AlbumListPageProps {
  albums?: AlbumSummary[];
  onLoadAlbumCollectionOptions?: () => Promise<AlbumCollectionOption[]>;
  onLoadAlbumCollection?: (
    collectionId: string,
    page?: AlbumCollectionPageInput,
  ) => Promise<AlbumCollectionSummary | null>;
  onLoadAlbumCollections?: () => Promise<AlbumCollectionSummary[]>;
}

function mapFlatAlbumsToCollection(albums: AlbumSummary[] = []): AlbumCollectionSummary[] {
  if (albums.length === 0) {
    return [];
  }

  return [
    {
      id: 'ungrouped-albums',
      title: 'Ungrouped albums',
      source: 'manual',
      sourceUrl: '',
      description: '',
      albums: albums.map((album) => ({
        ...album,
        rank: null,
        coverUrl: '',
        styles: [],
        reviewNote: album.notes,
      })),
    },
  ];
}

export function AlbumListPage({
  albums,
  onLoadAlbumCollectionOptions = listAlbumCollectionOptions,
  onLoadAlbumCollection = getAlbumCollectionById,
  onLoadAlbumCollections,
}: AlbumListPageProps) {
  const { t } = useI18n();
  const hasProvidedAlbums = Array.isArray(albums);
  const [loadedCollections, setLoadedCollections] = useState<AlbumCollectionSummary[]>(() =>
    mapFlatAlbumsToCollection(albums),
  );
  const [collectionOptions, setCollectionOptions] = useState<AlbumCollectionOption[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [collectionSearch, setCollectionSearch] = useState('');
  const [isLoading, setIsLoading] = useState(!hasProvidedAlbums);
  const [error, setError] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [styleSearch, setStyleSearch] = useState('');
  const [collectionPageIndexes, setCollectionPageIndexes] = useState<Record<string, number>>({});
  const [expandedDescriptionIds, setExpandedDescriptionIds] = useState<Record<string, boolean>>({});
  const [expandedNoteIds, setExpandedNoteIds] = useState<Record<string, boolean>>({});

  async function loadCollectionPage(collectionId: string, pageIndex: number, styleName = selectedStyle) {
    const pageInput: AlbumCollectionPageInput = { pageIndex, pageSize: albumPageSize };
    if (styleName) {
      pageInput.style = styleName;
    }
    const nextCollection = await onLoadAlbumCollection(collectionId, pageInput);
    setLoadedCollections(nextCollection ? [nextCollection] : []);
    setCollectionPageIndexes((currentPageIndexes) => ({
      ...currentPageIndexes,
      [collectionId]: pageIndex,
    }));
  }

  useEffect(() => {
    if (hasProvidedAlbums) {
      setCollectionOptions([]);
      setSelectedCollectionId('');
      setCollectionSearch('');
      setStyleSearch('');
      setLoadedCollections(mapFlatAlbumsToCollection(albums));
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError('');

      try {
        if (onLoadAlbumCollections) {
          const nextCollections = await onLoadAlbumCollections();
          if (isMounted) {
            setLoadedCollections(nextCollections);
            setCollectionOptions(nextCollections.map(({ albums: _albums, ...collection }) => collection));
            setSelectedCollectionId(nextCollections[0]?.id ?? '');
            setCollectionSearch('');
            setStyleSearch('');
          }
          return;
        }

        const nextOptions = await onLoadAlbumCollectionOptions();
        const firstCollectionId = nextOptions[0]?.id ?? '';
        const firstCollection = firstCollectionId
          ? await onLoadAlbumCollection(firstCollectionId, { pageIndex: 0, pageSize: albumPageSize })
          : null;
        if (isMounted) {
          setCollectionOptions(nextOptions);
          setSelectedCollectionId(firstCollectionId);
          setCollectionSearch('');
          setStyleSearch('');
          setLoadedCollections(firstCollection ? [firstCollection] : []);
          setCollectionPageIndexes(firstCollectionId ? { [firstCollectionId]: 0 } : {});
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(caughtError instanceof Error ? caughtError.message : t('albums.loadError'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [
    albums,
    hasProvidedAlbums,
    onLoadAlbumCollection,
    onLoadAlbumCollectionOptions,
    onLoadAlbumCollections,
    t,
  ]);

  const displayCollections = useMemo(
    () => (hasProvidedAlbums ? mapFlatAlbumsToCollection(albums) : loadedCollections),
    [albums, hasProvidedAlbums, loadedCollections],
  );
  const usesServerPagination = !hasProvidedAlbums && !onLoadAlbumCollections;
  const totalAlbums = displayCollections.reduce(
    (total, collection) => total + (collection.totalAlbumCount ?? collection.albums.length),
    0,
  );
  const styleOptions = useMemo(
    () =>
      Array.from(
        new Set(
          displayCollections.flatMap((collection) =>
            collection.availableStyles ?? collection.albums.flatMap((album) => album.styles),
          ),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [displayCollections],
  );
  const filteredCollectionOptions = useMemo(() => {
    const normalizedSearch = collectionSearch.trim().toLocaleLowerCase();
    if (!normalizedSearch) {
      return collectionOptions;
    }

    return collectionOptions.filter((collection) =>
      collection.title.toLocaleLowerCase().includes(normalizedSearch),
    );
  }, [collectionOptions, collectionSearch]);
  const filteredStyleOptions = useMemo(() => {
    const normalizedSearch = styleSearch.trim().toLocaleLowerCase();
    if (!normalizedSearch) {
      return styleOptions;
    }

    return styleOptions.filter((styleName) => styleName.toLocaleLowerCase().includes(normalizedSearch));
  }, [styleOptions, styleSearch]);
  const filteredCollections = displayCollections
    .map((collection) => ({
      ...collection,
      albums: selectedStyle && !usesServerPagination
        ? collection.albums.filter((album) => album.styles.includes(selectedStyle))
        : collection.albums,
    }))
    .filter((collection) => collection.albums.length > 0);

  useEffect(() => {
    setCollectionPageIndexes({});
  }, [selectedStyle]);

  useEffect(() => {
    setExpandedDescriptionIds({});
    setExpandedNoteIds({});
  }, [displayCollections]);

  async function updateCollectionPage(collectionId: string, nextPageIndex: number) {
    if (hasProvidedAlbums || onLoadAlbumCollections) {
      setCollectionPageIndexes((currentPageIndexes) => ({
        ...currentPageIndexes,
        [collectionId]: nextPageIndex,
      }));
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await loadCollectionPage(collectionId, nextPageIndex, selectedStyle);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('albums.loadError'));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSelectCollection(collectionId: string) {
    setSelectedCollectionId(collectionId);
    setSelectedStyle('');
    setStyleSearch('');
    setIsLoading(true);
    setError('');

    try {
      await loadCollectionPage(collectionId, 0);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('albums.loadError'));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSelectStyle(styleName: string) {
    setSelectedStyle(styleName);
    setStyleSearch('');

    if (!usesServerPagination || !selectedCollectionId) {
      setCollectionPageIndexes({});
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await loadCollectionPage(selectedCollectionId, 0, styleName);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('albums.loadError'));
    } finally {
      setIsLoading(false);
    }
  }

  function toggleCollectionDescription(collectionId: string) {
    setExpandedDescriptionIds((currentDescriptionIds) => ({
      ...currentDescriptionIds,
      [collectionId]: !currentDescriptionIds[collectionId],
    }));
  }

  function toggleAlbumNote(noteId: string) {
    setExpandedNoteIds((currentNoteIds) => ({
      ...currentNoteIds,
      [noteId]: !currentNoteIds[noteId],
    }));
  }

  function moveCollectionOption(collectionId: string, direction: -1 | 1) {
    setCollectionOptions((currentOptions) => {
      const currentIndex = currentOptions.findIndex((collection) => collection.id === collectionId);
      const nextIndex = currentIndex + direction;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= currentOptions.length) {
        return currentOptions;
      }

      const nextOptions = [...currentOptions];
      [nextOptions[currentIndex], nextOptions[nextIndex]] = [nextOptions[nextIndex], nextOptions[currentIndex]];
      return nextOptions;
    });
  }

  return (
    <section className="albums-page">
      <div className="albums-hero">
        <div>
          <p className="eyebrow">{t('albums.eyebrow')}</p>
          <h1>{t('albums.title')}</h1>
        </div>
        <div className="albums-hero__summary">
          <strong>{totalAlbums}</strong>
          <span>{t('albums.total')}</span>
        </div>
      </div>

      <section className="albums-toolbar" aria-label={t('albums.toolbarLabel')}>
        {!hasProvidedAlbums && collectionOptions.length > 0 ? (
          <div className="albums-filter-bar albums-filter-panel">
            <label htmlFor="album-collection-filter">
              Collection category
              <input
                id="album-collection-filter"
                type="search"
                value={collectionSearch}
                aria-label="Search collection categories"
                onChange={(event) => setCollectionSearch(event.target.value)}
              />
            </label>
            <div className="albums-option-list" aria-label="Collection categories">
              {filteredCollectionOptions.map((collection) => {
                const collectionIndex = collectionOptions.findIndex((option) => option.id === collection.id);
                return (
                  <div className="albums-option-row" key={collection.id}>
                    <button
                      type="button"
                      className={collection.id === selectedCollectionId ? 'is-selected' : ''}
                      onClick={() => handleSelectCollection(collection.id)}
                    >
                      {collection.title}
                    </button>
                    <div className="albums-option-row__actions">
                      <button
                        type="button"
                        aria-label={`Move ${collection.title} up`}
                        disabled={collectionIndex <= 0}
                        onClick={() => moveCollectionOption(collection.id, -1)}
                      >
                        鈫?                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${collection.title} down`}
                        disabled={collectionIndex < 0 || collectionIndex >= collectionOptions.length - 1}
                        onClick={() => moveCollectionOption(collection.id, 1)}
                      >
                        鈫?                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
        {!isLoading && displayCollections.length > 0 ? (
          <div className="albums-filter-bar albums-filter-panel">
            <label htmlFor="album-style-filter">
              {t('albums.styleFilterLabel')}
              <input
                id="album-style-filter"
                type="search"
                value={styleSearch}
                aria-label="Search styles"
                onChange={(event) => setStyleSearch(event.target.value)}
              />
            </label>
            <div className="albums-style-options" aria-label="Style options">
              <button
                type="button"
                className={!selectedStyle ? 'is-selected' : ''}
                onClick={() => handleSelectStyle('')}
              >
                {t('albums.allStyles')}
              </button>
              {filteredStyleOptions.map((styleName) => (
                <button
                  type="button"
                  className={styleName === selectedStyle ? 'is-selected' : ''}
                  key={styleName}
                  onClick={() => handleSelectStyle(styleName)}
                >
                  {styleName}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {error ? <p className="albums-error" role="alert">{error}</p> : null}
      {isLoading ? <p className="albums-loading">{t('albums.loading')}</p> : null}

      {!isLoading && displayCollections.length === 0 ? <p className="albums-empty">{t('albums.empty')}</p> : null}

      {!isLoading && displayCollections.length > 0 && filteredCollections.length === 0 ? (
        <p className="albums-empty">{t('albums.noStyleResults')}</p>
      ) : null}

      {!isLoading && filteredCollections.length > 0 ? (
        <div className="albums-collections">
          {filteredCollections.map((collection) => {
            const collectionAlbumCount = collection.totalAlbumCount ?? collection.albums.length;
            const pageCount = Math.max(1, Math.ceil(collectionAlbumCount / albumPageSize));
            const currentPageIndex = Math.min(collectionPageIndexes[collection.id] ?? 0, pageCount - 1);
            const startIndex = currentPageIndex * albumPageSize;
            const endIndex = Math.min(startIndex + albumPageSize, collectionAlbumCount);
            const pageAlbums = usesServerPagination
              ? collection.albums
              : collection.albums.slice(startIndex, endIndex);
            const isDescriptionExpanded = Boolean(expandedDescriptionIds[collection.id]);

            return (
              <section className="albums-collection" key={collection.id}>
                <header className="albums-collection__header">
                  <div>
                    <p>{collection.source}</p>
                    <h2>{collection.title}</h2>
                    {collection.description ? (
                      <div className="albums-collection__description">
                        <span className={isDescriptionExpanded ? 'is-expanded' : ''}>{collection.description}</span>
                        <button
                          type="button"
                          aria-expanded={isDescriptionExpanded}
                          onClick={() => toggleCollectionDescription(collection.id)}
                        >
                          {isDescriptionExpanded ? t('albums.collapseDescription') : t('albums.expandDescription')}
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div className="albums-collection__meta">
                    <span>
                      {t('albums.collectionCount').replace('{count}', String(collectionAlbumCount))}
                    </span>
                    {collection.sourceUrl ? <a href={collection.sourceUrl}>{t('albums.openSourceLink')}</a> : null}
                  </div>
                </header>

                <div className="albums-collection__list">
                  {pageAlbums.map((album) => {
                    const noteId = `${collection.id}:${album.id}`;
                    const noteText = album.reviewNote || album.notes || t('albums.noNotes');
                    const isNoteExpanded = Boolean(expandedNoteIds[noteId]);

                    return (
                      <article className="albums-card" key={`${collection.id}:${album.id}`}>
                        <div className="albums-card__rank">{album.rank ? `#${album.rank}` : t('albums.noRank')}</div>
                        <div className="albums-card__cover">
                          {album.coverUrl ? (
                            <img src={album.coverUrl} alt={`${album.title} ${t('albums.coverAltSuffix')}`} loading="lazy" />
                          ) : (
                            <span>{t('albums.noCover')}</span>
                          )}
                        </div>
                        <div className="albums-card__body">
                          <h3>
                            <a href={`#album/${encodeURIComponent(album.id)}`}>{album.title}</a>
                          </h3>
                          <div className="albums-card__meta">
                            <span>{album.artistName || t('albums.unknown')}</span>
                            <span>{album.releaseYear ?? t('albums.unknown')}</span>
                          </div>
                          {album.styles.length > 0 ? (
                            <div className="albums-card__styles">
                              {album.styles.map((styleName) => (
                                <span key={styleName}>{styleName}</span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className={`albums-card__note${isNoteExpanded ? ' is-expanded' : ''}`}
                          aria-expanded={isNoteExpanded}
                          onClick={() => toggleAlbumNote(noteId)}
                        >
                          {noteText}
                        </button>
                      </article>
                    );
                  })}
                </div>

                <div className="albums-collection__pagination" aria-label={t('albums.collectionPaginationLabel')}>
                  <p>
                    {t('albums.collectionPaginationRange')
                      .replace('{start}', String(startIndex + 1))
                      .replace('{end}', String(endIndex))
                      .replace('{total}', String(collectionAlbumCount))}
                  </p>
                  <div>
                    <button
                      type="button"
                      disabled={currentPageIndex === 0}
                      onClick={() => updateCollectionPage(collection.id, currentPageIndex - 1)}
                    >
                      {t('albums.previousPage')}
                    </button>
                    <button
                      type="button"
                      disabled={currentPageIndex >= pageCount - 1}
                      onClick={() => updateCollectionPage(collection.id, currentPageIndex + 1)}
                    >
                      {t('albums.nextPage')}
                    </button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
