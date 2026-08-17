import { type FocusEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Panel } from '../../components/ui';
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

interface CollectionDescriptionProps {
  collapseLabel: string;
  description: string;
  expandLabel: string;
  isExpanded: boolean;
  onToggle: () => void;
}

function CollectionDescription({
  collapseLabel,
  description,
  expandLabel,
  isExpanded,
  onToggle,
}: CollectionDescriptionProps) {
  const descriptionRef = useRef<HTMLSpanElement | null>(null);
  const [canExpand, setCanExpand] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      return undefined;
    }

    function measureOverflow() {
      const descriptionElement = descriptionRef.current;
      if (!descriptionElement) {
        setCanExpand(false);
        return;
      }

      setCanExpand(descriptionElement.scrollHeight > descriptionElement.clientHeight + 1);
    }

    measureOverflow();
    window.addEventListener('resize', measureOverflow);

    return () => {
      window.removeEventListener('resize', measureOverflow);
    };
  }, [description, isExpanded]);

  return (
    <div className="albums-collection__description">
      <span ref={descriptionRef} className={isExpanded ? 'is-expanded' : ''}>{description}</span>
      {canExpand ? (
        <button className="ui-button-unstyled" type="button" aria-expanded={isExpanded} onClick={onToggle}>
          {isExpanded ? collapseLabel : expandLabel}
        </button>
      ) : null}
    </div>
  );
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

function formatAlbumRank(rank: number | null) {
  return rank ? String(rank).padStart(2, '0') : null;
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
  const [isCollectionDropdownOpen, setIsCollectionDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(!hasProvidedAlbums);
  const [error, setError] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [styleSearch, setStyleSearch] = useState('');
  const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState(false);
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
  const heroAlbumTotal = isLoading && totalAlbums === 0 ? 55 : totalAlbums;
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
  const selectedCollectionLabel = collectionOptions.find((collection) => collection.id === selectedCollectionId)?.title
    ?? collectionOptions[0]?.title
    ?? '';
  const selectedStyleLabel = selectedStyle || t('albums.allStyles');
  const collectionInputValue = isCollectionDropdownOpen ? collectionSearch : selectedCollectionLabel;
  const styleInputValue = isStyleDropdownOpen ? styleSearch : selectedStyleLabel;
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

  async function selectCollectionFromDropdown(collectionId: string) {
    setIsCollectionDropdownOpen(false);
    setCollectionSearch('');
    await handleSelectCollection(collectionId);
  }

  async function selectStyleFromDropdown(styleName: string) {
    setIsStyleDropdownOpen(false);
    setStyleSearch('');
    await handleSelectStyle(styleName);
  }

  function handleCollectionDropdownBlur(event: FocusEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }

    setIsCollectionDropdownOpen(false);
    setCollectionSearch('');
  }

  function handleStyleDropdownBlur(event: FocusEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }

    setIsStyleDropdownOpen(false);
    setStyleSearch('');
  }

  return (
    <section className="albums-page">
      <Panel as="header" className="albums-hero" variant="hero">
        <div className="albums-hero__heading">
          <span className="albums-hero__year">2025</span>
          <h1>
            <span>Best Metal</span>
            <span>Albums <em>Top {heroAlbumTotal}</em></span>
          </h1>
        </div>
        <aside className="albums-hero__note">
          <strong>2025 版</strong>
          <p>这不是权威答案，是一间私人唱片房里，经过多年反复聆听留下的顺序。</p>
        </aside>
      </Panel>

      <section className="albums-toolbar" aria-label={t('albums.toolbarLabel')}>
        {!hasProvidedAlbums && collectionOptions.length > 0 ? (
          <div className="ui-searchable-dropdown albums-filter-dropdown" onBlur={handleCollectionDropdownBlur}>
            <span>Collection category</span>
            <input
              className="albums-filter-input"
              type="search"
              value={collectionInputValue}
              aria-label="Collection category"
              aria-expanded={isCollectionDropdownOpen}
              aria-controls="album-collection-filter-panel"
              onFocus={() => setIsCollectionDropdownOpen(true)}
              onClick={() => setIsCollectionDropdownOpen(true)}
              onChange={(event) => {
                setCollectionSearch(event.target.value);
                setIsCollectionDropdownOpen(true);
              }}
            />
            {isCollectionDropdownOpen ? (
              <div className="albums-dropdown-panel" id="album-collection-filter-panel">
                <div className="albums-dropdown-list" aria-label="Collection categories">
                  {filteredCollectionOptions.map((collection) => (
                    <button
                      type="button"
                      className={`ui-button-unstyled albums-dropdown-option${collection.id === selectedCollectionId ? ' is-selected' : ''}`}
                      key={collection.id}
                      onClick={() => selectCollectionFromDropdown(collection.id)}
                    >
                      {collection.title}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {!isLoading && displayCollections.length > 0 ? (
          <div className="ui-searchable-dropdown albums-filter-dropdown" onBlur={handleStyleDropdownBlur}>
            <span>{t('albums.styleFilterLabel')}</span>
            <input
              className="albums-filter-input"
              type="search"
              value={styleInputValue}
              aria-label={t('albums.styleFilterLabel')}
              aria-expanded={isStyleDropdownOpen}
              aria-controls="album-style-filter-panel"
              onFocus={() => setIsStyleDropdownOpen(true)}
              onClick={() => setIsStyleDropdownOpen(true)}
              onChange={(event) => {
                setStyleSearch(event.target.value);
                setIsStyleDropdownOpen(true);
              }}
            />
            {isStyleDropdownOpen ? (
              <div className="albums-dropdown-panel" id="album-style-filter-panel">
                <div className="albums-dropdown-list" aria-label="Style options">
                  <button
                    type="button"
                    className={`ui-button-unstyled albums-dropdown-option${!selectedStyle ? ' is-selected' : ''}`}
                    onClick={() => selectStyleFromDropdown('')}
                  >
                    {t('albums.allStyles')}
                  </button>
                  {filteredStyleOptions.map((styleName) => (
                    <button
                      type="button"
                      className={`ui-button-unstyled albums-dropdown-option${styleName === selectedStyle ? ' is-selected' : ''}`}
                      key={styleName}
                      onClick={() => selectStyleFromDropdown(styleName)}
                    >
                      {styleName}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {!isLoading && totalAlbums > 0 ? (
          <span className="albums-toolbar__range">
            01—{String(Math.min(albumPageSize, totalAlbums)).padStart(2, '0')} / {totalAlbums}
          </span>
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
              <Panel as="section" className="albums-collection" key={collection.id} variant="card">
                <header className="albums-collection__header">
                  <div className="albums-collection__identity">
                    <p>{collection.source}</p>
                    <h2>{collection.title}</h2>
                  </div>
                  {collection.description ? (
                    <CollectionDescription
                      collapseLabel={t('albums.collapseDescription')}
                      description={collection.description}
                      expandLabel={t('albums.expandDescription')}
                      isExpanded={isDescriptionExpanded}
                      onToggle={() => toggleCollectionDescription(collection.id)}
                    />
                  ) : null}
                  <div className="albums-collection__meta">
                    <span>
                      {t('albums.collectionCount').replace('{count}', String(collectionAlbumCount))}
                    </span>
                    {/* 暂时隐藏来源入口，后续需要时可恢复 collection.sourceUrl 链接。 */}
                  </div>
                </header>

                <div className="albums-collection__list">
                  {pageAlbums.map((album, albumIndex) => {
                    const noteId = `${collection.id}:${album.id}`;
                    const noteText = album.reviewNote || album.notes || t('albums.noNotes');
                    const isNoteExpanded = Boolean(expandedNoteIds[noteId]);
                    const cardVariant = albumIndex < 3 ? 'feature' : albumIndex < 5 ? 'rail' : 'list';
                    const formattedRank = formatAlbumRank(album.rank);

                    return (
                      <article
                        className={`albums-card albums-card--${cardVariant}`}
                        key={`${collection.id}:${album.id}`}
                      >
                        <div className="albums-card__rank">{formattedRank ?? t('albums.noRank')}</div>
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
                          className={`ui-button-unstyled albums-card__note${isNoteExpanded ? ' is-expanded' : ''}`}
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
                      className="ui-button-unstyled"
                      disabled={currentPageIndex === 0}
                      onClick={() => updateCollectionPage(collection.id, currentPageIndex - 1)}
                    >
                      {t('albums.previousPage')}
                    </button>
                    <button
                      type="button"
                      className="ui-button-unstyled"
                      disabled={currentPageIndex >= pageCount - 1}
                      onClick={() => updateCollectionPage(collection.id, currentPageIndex + 1)}
                    >
                      {t('albums.nextPage')}
                    </button>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
