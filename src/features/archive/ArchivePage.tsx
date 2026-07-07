import { FormEvent, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
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
}

const initialForm: CreateArchiveCollectionInput = {
  title: '',
  source: '',
  sourceUrl: '',
  description: '',
  collectionType: 'album_rank',
};

export function ArchivePage({
  onCreateCollection = createArchiveCollection,
  onDeleteCollection = deleteArchiveCollection,
  onLoadCollections = listArchiveCollections,
  onUpdateCollection = updateArchiveCollection,
}: ArchivePageProps) {
  const { t } = useI18n();
  const [collections, setCollections] = useState<ArchiveCollectionSummary[]>([]);
  const [form, setForm] = useState<CreateArchiveCollectionInput>(initialForm);
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
            <div className="archive-table" role="table" aria-label={t('archive.collectionsTitle')}>
              <div className="archive-table-row archive-table-head" role="row">
                <span role="columnheader">{t('archive.columnCollection')}</span>
                <span role="columnheader">{t('archive.columnSource')}</span>
                <span role="columnheader">{t('archive.columnType')}</span>
                <span role="columnheader">{t('archive.columnDescription')}</span>
                <span role="columnheader">{t('archive.columnActions')}</span>
              </div>
              {collections.map((collection) => (
                <article className="archive-table-row" key={collection.id} role="row">
                  <h3 role="cell">
                    <a href={`#archive/${encodeURIComponent(collection.id)}`}>{collection.title}</a>
                  </h3>
                  <div className="archive-source-cell" role="cell">
                    <span>{collection.source}</span>
                    {collection.sourceUrl ? <a href={collection.sourceUrl}>Open source link</a> : null}
                  </div>
                  <p role="cell">{collection.collectionType}</p>
                  <p className="archive-collection-description" role="cell">
                    {collection.description || t('archive.noDescription')}
                  </p>
                  <div className="archive-row-actions" role="cell">
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
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <form className="archive-form" onSubmit={handleSubmit}>
          <div className="archive-form-heading">
            <p className="archive-form-mode">{editingCollectionId ? t('archive.editMode') : t('archive.formMode')}</p>
            <h2>{editingCollectionId ? t('archive.editCollectionTitle') : t('archive.addCollectionTitle')}</h2>
          </div>
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
            {message ? <p role="status">{message}</p> : null}
          </div>
        </form>
      </div>
    </section>
  );
}
