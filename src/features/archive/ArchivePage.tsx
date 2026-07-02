import { FormEvent, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { ArchiveCollectionSummary, CreateArchiveCollectionInput } from './archive.types';
import { createArchiveCollection, listArchiveCollections } from './archive.service';
import './ArchivePage.css';

interface ArchivePageProps {
  onCreateCollection?: (input: CreateArchiveCollectionInput) => Promise<void>;
  onLoadCollections?: () => Promise<ArchiveCollectionSummary[]>;
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
  onLoadCollections = listArchiveCollections,
}: ArchivePageProps) {
  const { t } = useI18n();
  const [collections, setCollections] = useState<ArchiveCollectionSummary[]>([]);
  const [form, setForm] = useState<CreateArchiveCollectionInput>(initialForm);
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
    await onCreateCollection({
      ...form,
      title: form.title.trim(),
      source: form.source.trim() || 'manual',
      sourceUrl: form.sourceUrl.trim(),
      description: form.description.trim(),
      collectionType: form.collectionType.trim() || 'album_rank',
    });
    setForm(initialForm);
    setMessage(t('archive.collectionAdded'));
    await loadCollections();
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
              </div>
              {collections.map((collection) => (
                <article className="archive-table-row" key={collection.id} role="row">
                  <h3 role="cell">
                    <a href={`#archive/${encodeURIComponent(collection.id)}`}>{collection.title}</a>
                  </h3>
                  <p role="cell">{collection.source}</p>
                  <p role="cell">{collection.collectionType}</p>
                  <p role="cell">{collection.description || t('archive.noDescription')}</p>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <form className="archive-form" onSubmit={handleSubmit}>
          <div className="archive-form-heading">
            <p className="archive-form-mode">{t('archive.formMode')}</p>
            <h2>{t('archive.addCollectionTitle')}</h2>
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
            <button type="submit">{t('archive.addCollectionSubmit')}</button>
            {message ? <p role="status">{message}</p> : null}
          </div>
        </form>
      </div>
    </section>
  );
}
