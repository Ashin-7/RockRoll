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
      <p className="eyebrow">{t('archive.eyebrow')}</p>
      <h1>{t('archive.title')}</h1>
      <div className="archive-sections">
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
        <form className="archive-form" onSubmit={handleSubmit}>
          <h2>{t('archive.addCollectionTitle')}</h2>
          <label>
            {t('archive.collectionTitleLabel')}
            <input
              required
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
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
          <label>
            {t('archive.descriptionLabel')}
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </label>
          <button type="submit">{t('archive.addCollectionSubmit')}</button>
          {message ? <p role="status">{message}</p> : null}
        </form>

        <div className="archive-collection-list">
          <h2>{t('archive.collectionsTitle')}</h2>
          {isLoading ? <p>{t('archive.collectionsLoading')}</p> : null}
          {error ? <p role="alert">{error}</p> : null}
          {!isLoading && !error && collections.length === 0 ? <p>{t('archive.collectionsEmpty')}</p> : null}
          <div className="archive-collection-grid">
            {collections.map((collection) => (
              <article key={collection.id}>
                <h3>
                  <a href={`#archive/${encodeURIComponent(collection.id)}`}>{collection.title}</a>
                </h3>
                <p>{collection.source}</p>
                {collection.description ? <p>{collection.description}</p> : null}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
