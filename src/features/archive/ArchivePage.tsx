import { FormEvent, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { AnontravelerPreview } from '../inbox/anontraveler.types';
import { mapAnontravelerPreviewCandidates, previewAnontravelerImport } from '../inbox/anontraveler.service';
import {
  commitPublicImportReviewPlan,
  createImportReviewPlan,
  getCurrentUserImportRole,
  saveImportCandidatesDraft,
} from '../inbox/inbox.service';
import { ImportUserRole } from '../inbox/inbox.types';
import { ArchiveCollectionSummary, CreateArchiveCollectionInput, UpdateArchiveCollectionInput } from './archive.types';
import {
  createArchiveCollection,
  deleteArchiveCollection,
  listArchiveCollections,
  updateArchiveCollection,
} from './archive.service';
import './ArchivePage.css';

interface ArchivePageProps {
  onCreateCollection?: (input: CreateArchiveCollectionInput) => Promise<void>;
  onDeleteCollection?: (collectionId: string) => Promise<void>;
  onLoadCollections?: () => Promise<ArchiveCollectionSummary[]>;
  onUpdateCollection?: (collectionId: string, input: UpdateArchiveCollectionInput) => Promise<void>;
  onPreviewAnontraveler?: typeof previewAnontravelerImport;
  onMapAnontravelerPreviewCandidates?: typeof mapAnontravelerPreviewCandidates;
  onSaveCandidatesDraft?: typeof saveImportCandidatesDraft;
  onCreateReviewPlan?: typeof createImportReviewPlan;
  onLoadImportRole?: typeof getCurrentUserImportRole;
  onCommitPublicImportReviewPlan?: typeof commitPublicImportReviewPlan;
}

const initialForm: CreateArchiveCollectionInput = {
  title: '',
  source: '',
  sourceUrl: '',
  description: '',
  collectionType: 'album_rank',
};

function formatMessage(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (nextMessage, [key, value]) => nextMessage.replace(`{${key}}`, String(value)),
    template,
  );
}

export function ArchivePage({
  onCreateCollection = createArchiveCollection,
  onDeleteCollection = deleteArchiveCollection,
  onLoadCollections = listArchiveCollections,
  onUpdateCollection = updateArchiveCollection,
  onPreviewAnontraveler = previewAnontravelerImport,
  onMapAnontravelerPreviewCandidates = mapAnontravelerPreviewCandidates,
  onSaveCandidatesDraft = saveImportCandidatesDraft,
  onCreateReviewPlan = createImportReviewPlan,
  onLoadImportRole = getCurrentUserImportRole,
  onCommitPublicImportReviewPlan = commitPublicImportReviewPlan,
}: ArchivePageProps) {
  const { t } = useI18n();
  const [collections, setCollections] = useState<ArchiveCollectionSummary[]>([]);
  const [form, setForm] = useState<CreateArchiveCollectionInput>(initialForm);
  const [anontravelerUrl, setAnontravelerUrl] = useState('');
  const [anontravelerPreview, setAnontravelerPreview] = useState<AnontravelerPreview | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewDescription, setPreviewDescription] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [importRole, setImportRole] = useState<ImportUserRole>('anonymous');
  const [isImportingCollection, setIsImportingCollection] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSummary, setImportSummary] = useState('');
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadCollections() {
    setIsLoading(true);
    setError(null);
    try {
      setCollections(await onLoadCollections());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('archive.collectionsLoadError'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCollections();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadRole() {
      try {
        const nextRole = await onLoadImportRole();
        if (isMounted) {
          setImportRole(nextRole);
        }
      } catch {
        if (isMounted) {
          setImportRole('anonymous');
        }
      }
    }

    loadRole();

    return () => {
      isMounted = false;
    };
  }, [onLoadImportRole]);

  async function handlePreviewAnontraveler(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setPreviewError('');
    setImportError('');
    setImportSummary('');
    setAnontravelerPreview(null);
    setIsPreviewLoading(true);

    try {
      const preview = await onPreviewAnontraveler(anontravelerUrl.trim());
      setAnontravelerPreview(preview);
      setPreviewTitle(preview.collection.title);
      setPreviewDescription(preview.collection.description);
    } catch (caughtError) {
      setPreviewError(caughtError instanceof Error ? caughtError.message : t('archive.urlImportPreviewError'));
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function handleImportAnontravelerCollection() {
    if (!anontravelerPreview) {
      return;
    }

    const sourceUrl = anontravelerUrl.trim();
    const candidatesToImport = onMapAnontravelerPreviewCandidates(anontravelerPreview);
    const collectionTitle = previewTitle.trim() || anontravelerPreview.collection.title;
    const collectionDescription = previewDescription.trim() || anontravelerPreview.collection.description;

    setMessage(null);
    setImportError('');
    setImportSummary('');
    setIsImportingCollection(true);

    try {
      const previewArchiveItemCount = anontravelerPreview.archiveItems.length;
      const draft = await onSaveCandidatesDraft({
        sourceName: 'anontraveler',
        query: sourceUrl,
        candidates: candidatesToImport,
      });

      const reviewPlan = await onCreateReviewPlan({
        importJobId: draft.importJobId,
        sourceName: 'anontraveler',
        sourceUrl,
        candidates: candidatesToImport,
        archiveCollection: {
          externalId: anontravelerPreview.collection.externalId,
          title: collectionTitle,
          description: collectionDescription,
          collectionType: anontravelerPreview.collection.collectionType,
        },
        archiveItems: anontravelerPreview.archiveItems,
      });

      const result = await onCommitPublicImportReviewPlan();
      const committedCount = result.createdCount + result.matchedCount + result.skippedCount;
      setAnontravelerPreview(null);
      setAnontravelerUrl('');
      setPreviewTitle('');
      setPreviewDescription('');
      setMessage(
        formatMessage(t('archive.urlImportSuccess'), {
          created: result.createdCount,
          matched: result.matchedCount,
          skipped: result.skippedCount,
        }),
      );
      setImportSummary(
        formatMessage(t('archive.urlImportSummary'), {
          preview: previewArchiveItemCount,
          saved: draft.savedCount,
          planned: reviewPlan.plannedCount,
          committed: committedCount,
        }),
      );
      await loadCollections();
    } catch (caughtError) {
      setImportError(caughtError instanceof Error ? caughtError.message : t('archive.urlImportError'));
    } finally {
      setIsImportingCollection(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const input = {
      ...form,
      title: form.title.trim(),
      source: form.source.trim() || 'manual',
      sourceUrl: form.sourceUrl.trim(),
      description: form.description.trim(),
      collectionType: form.collectionType.trim() || 'album_rank',
    };

    if (editingCollectionId) {
      await onUpdateCollection(editingCollectionId, input);
    } else {
      await onCreateCollection(input);
    }
    setForm(initialForm);
    setEditingCollectionId(null);
    setMessage(editingCollectionId ? t('archive.collectionUpdated') : t('archive.collectionAdded'));
    await loadCollections();
  }

  function handleEditCollection(collection: ArchiveCollectionSummary) {
    setEditingCollectionId(collection.id);
    setMessage(null);
    setForm({
      title: collection.title,
      source: collection.source,
      sourceUrl: collection.sourceUrl,
      description: collection.description,
      collectionType: collection.collectionType,
    });
  }

  async function handleDeleteCollection(collection: ArchiveCollectionSummary) {
    setMessage(null);
    await onDeleteCollection(collection.id);
    if (editingCollectionId === collection.id) {
      setEditingCollectionId(null);
      setForm(initialForm);
    }
    setMessage(t('archive.collectionDeleted'));
    await loadCollections();
  }

  function handleCancelEdit() {
    setEditingCollectionId(null);
    setForm(initialForm);
    setMessage(null);
  }

  return (
    <section className="archive-page">
      <header className="archive-hero">
        <div>
          <p className="eyebrow">{t('archive.eyebrow')}</p>
          <h1>{t('archive.title')}</h1>
        </div>
        <div className="archive-hero-metric">
          <span>{collections.length}</span>
          <p>{t('archive.totalCollections')}</p>
        </div>
      </header>

      <div className="archive-sections" aria-label={t('archive.librarySectionsLabel')}>
        <article>
          <h2>{t('archive.artists')}</h2>
          <p>{t('archive.artistsDescription')}</p>
        </article>
        <article>
          <h2>
            <a href="#albums">{t('archive.albums')}</a>
          </h2>
          <p>{t('archive.albumsDescription')}</p>
        </article>
        <article>
          <h2>{t('archive.genres')}</h2>
          <p>{t('archive.genresDescription')}</p>
        </article>
      </div>

      <div className="archive-collections">
        <section className="archive-collection-list" aria-labelledby="archive-collections-title">
          <div className="archive-section-heading">
            <div>
              <p className="archive-section-kicker">{t('archive.collectionIndex')}</p>
              <h2 id="archive-collections-title">{t('archive.collectionsTitle')}</h2>
            </div>
          </div>
          {isLoading ? <p>{t('archive.collectionsLoading')}</p> : null}
          {error ? <p role="alert">{error}</p> : null}
          {!isLoading && !error && collections.length === 0 ? <p>{t('archive.collectionsEmpty')}</p> : null}
          {!isLoading && !error && collections.length > 0 ? (
            <div className="archive-collection-cards" aria-label={t('archive.collectionsTitle')}>
              {collections.map((collection) => (
                <details className="archive-collection-card" key={collection.id}>
                  <summary className="archive-collection-card__summary">
                    <span className="archive-collection-card__title">{collection.title}</span>
                    <span className="archive-collection-card__meta">
                      <span>{collection.source}</span>
                      <span>{collection.collectionType}</span>
                    </span>
                  </summary>
                  <div className="archive-collection-card__body">
                    <p className="archive-collection-description">{collection.description || t('archive.noDescription')}</p>
                    <div className="archive-source-cell">
                      <span>{collection.source}</span>
                      {collection.sourceUrl ? <a href={collection.sourceUrl}>Open source link</a> : null}
                    </div>
                    <div className="archive-row-actions">
                      <a href={`#archive/${encodeURIComponent(collection.id)}`}>{t('archive.openCollectionAction')}</a>
                      <button
                        type="button"
                        aria-label={`${t('archive.editAction')} ${collection.title}`}
                        onClick={() => handleEditCollection(collection)}
                      >
                        {t('archive.editAction')}
                      </button>
                      <button
                        type="button"
                        aria-label={`${t('archive.deleteAction')} ${collection.title}`}
                        onClick={() => handleDeleteCollection(collection)}
                      >
                        {t('archive.deleteAction')}
                      </button>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          ) : null}
        </section>

        <div className="archive-form">
          <div className="archive-form-heading">
            <p className="archive-form-mode">{editingCollectionId ? t('archive.editMode') : t('archive.formMode')}</p>
            <h2>{editingCollectionId ? t('archive.editCollectionTitle') : t('archive.addCollectionTitle')}</h2>
          </div>
          {editingCollectionId ? null : (
            <form className="archive-url-import" onSubmit={handlePreviewAnontraveler}>
              <fieldset>
                <legend>{t('archive.urlImportSection')}</legend>
                <label>
                  {t('archive.anontravelerUrlLabel')}
                  <input
                    required
                    value={anontravelerUrl}
                    onChange={(event) => setAnontravelerUrl(event.target.value)}
                  />
                </label>
              </fieldset>
              <div className="archive-form-actions">
                <button type="submit" disabled={isPreviewLoading || isImportingCollection}>
                  {isPreviewLoading ? t('archive.urlImportPreviewLoading') : t('archive.urlImportPreviewSubmit')}
                </button>
              </div>
            </form>
          )}

          {isPreviewLoading ? <p>{t('archive.urlImportPreviewLoading')}</p> : null}
          {previewError ? <p role="alert">{previewError}</p> : null}

          {anontravelerPreview ? (
            <section className="archive-import-preview" aria-label={t('archive.urlImportPreviewTitle')}>
              <div className="archive-form-heading">
                <p className="archive-form-mode">{t('archive.urlImportPreviewKicker')}</p>
                <h3>{t('archive.urlImportPreviewTitle')}</h3>
              </div>
              <fieldset>
                <legend>{t('archive.identitySection')}</legend>
                <label>
                  {t('archive.collectionTitleLabel')}
                  <input
                    required
                    value={previewTitle}
                    onChange={(event) => setPreviewTitle(event.target.value)}
                  />
                </label>
                <label>
                  {t('archive.descriptionLabel')}
                  <textarea
                    value={previewDescription}
                    onChange={(event) => setPreviewDescription(event.target.value)}
                  />
                </label>
              </fieldset>
              <div className="archive-import-preview__counts">
                <p>{t('archive.urlImportArchiveItemsCount').replace('{count}', String(anontravelerPreview.archiveItems.length))}</p>
                <p>{t('archive.urlImportAlbumsCount').replace('{count}', String(anontravelerPreview.albums.length))}</p>
                <p>{t('archive.urlImportSkippedSongsCount').replace('{count}', String(anontravelerPreview.skippedSongs))}</p>
              </div>
              <div className="archive-import-preview__samples">
                {anontravelerPreview.albums.slice(0, 3).map((album, albumIndex) => (
                  <article className="archive-import-sample" key={`${album.externalId}:${albumIndex}`}>
                    <span># {albumIndex + 1}</span>
                    <div className="archive-import-sample__cover">
                      {album.coverUrl ? (
                        <img src={album.coverUrl} alt={`${album.title} cover`} loading="lazy" />
                      ) : (
                        <span>{t('archive.urlImportNoCover')}</span>
                      )}
                    </div>
                    <div className="archive-import-sample__body">
                      <p className="archive-import-sample__artist">{album.artistName}</p>
                      <h4>{album.title}</h4>
                      <div className="archive-import-sample__meta" aria-label={`${album.title} metadata`}>
                        {album.releaseYear ? <span>[ {album.releaseYear} ]</span> : null}
                        {album.albumType ? <span>{album.albumType}</span> : null}
                        {album.styles.map((styleName) => (
                          <span key={styleName}>{styleName}</span>
                        ))}
                      </div>
                      {album.note ? <p className="archive-import-sample__note">{album.note}</p> : null}
                    </div>
                  </article>
                ))}
              </div>
              {importRole === 'admin' ? (
                <button
                  type="button"
                  onClick={handleImportAnontravelerCollection}
                  disabled={isImportingCollection || anontravelerPreview.archiveItems.length === 0}
                >
                  {isImportingCollection ? t('archive.urlImportSubmitLoading') : t('archive.urlImportSubmit')}
                </button>
              ) : null}
              {isImportingCollection ? <p role="status">{t('archive.urlImportStatus')}</p> : null}
              {importError ? <p role="alert">{importError}</p> : null}
            </section>
          ) : null}

          {!anontravelerPreview ? (
            <form className="archive-manual-form" onSubmit={handleSubmit}>
              <fieldset>
                <legend>{t('archive.identitySection')}</legend>
                <label>
                  {t('archive.collectionTitleLabel')}
                  <input
                    required
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  />
                </label>
                <label>
                  {t('archive.descriptionLabel')}
                  <textarea
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  />
                </label>
              </fieldset>
              <fieldset>
                <legend>{t('archive.sourceProfileSection')}</legend>
                <label>
                  {t('archive.sourceLabel')}
                  <input
                    value={form.source}
                    onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))}
                  />
                </label>
                <label>
                  {t('archive.sourceUrlLabel')}
                  <input
                    value={form.sourceUrl}
                    onChange={(event) => setForm((current) => ({ ...current, sourceUrl: event.target.value }))}
                  />
                </label>
              </fieldset>
              <div className="archive-form-actions">
                {editingCollectionId ? (
                  <button type="button" onClick={handleCancelEdit}>
                    {t('archive.cancelEdit')}
                  </button>
                ) : null}
                <button type="submit">
                  {editingCollectionId ? t('archive.updateCollectionSubmit') : t('archive.addCollectionSubmit')}
                </button>
              </div>
            </form>
          ) : null}
          {message ? <p role="status">{message}</p> : null}
          {importSummary ? <p>{importSummary}</p> : null}
        </div>
      </div>
    </section>
  );
}
