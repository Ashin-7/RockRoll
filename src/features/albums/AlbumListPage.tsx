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
  const [isLoading, setIsLoading] = useState(!hasProvidedAlbums);
  const [error, setError] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [collectionPageIndexes, setCollectionPageIndexes] = useState<Record<string, number>>({});
  const [expandedDescriptionIds, setExpandedDescriptionIds] = useState<Record<string, boolean>>({});
  const [expandedNoteIds, setExpandedNoteIds] = useState<Record<string, boolean>>({});

  async function loadCollectionPage(collectionId: string, pageIndex: number) {
    const nextCollection = await onLoadAlbumCollection(collectionId, { pageIndex, pageSize: albumPageSize });
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
        new Set(displayCollections.flatMap((collection) => collection.albums.flatMap((album) => album.styles))),
      ).sort((left, right) => left.localeCompare(right)),
    [displayCollections],
  );
  const filteredCollections = displayCollections
    .map((collection) => ({
      ...collection,
      albums: selectedStyle
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
      await loadCollectionPage(collectionId, nextPageIndex);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('albums.loadError'));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSelectCollection(collectionId: string) {
    setSelectedCollectionId(collectionId);
    setSelectedStyle('');
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
          <div className="albums-filter-bar">
            <label htmlFor="album-collection-filter">
              Collection category
              <select
                id="album-collection-filter"
                value={selectedCollectionId}
                onChange={(event) => handleSelectCollection(event.target.value)}
              >
                {collectionOptions.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
        {!isLoading && displayCollections.length > 0 ? (
          <div className="albums-filter-bar">
            <label htmlFor="album-style-filter">
              {t('albums.styleFilterLabel')}
              <select
                id="album-style-filter"
                value={selectedStyle}
                onChange={(event) => setSelectedStyle(event.target.value)}
              >
                <option value="">{t('albums.allStyles')}</option>
                {styleOptions.map((styleName) => (
                  <option key={styleName} value={styleName}>
                    {styleName}
                  </option>
                ))}
              </select>
            </label>
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
