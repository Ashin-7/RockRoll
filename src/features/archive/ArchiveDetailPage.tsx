import { FormEvent, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { addArchiveItem, getArchiveCollectionById } from './archive.service';
import { ArchiveCollectionDetail, CreateArchiveItemInput } from './archive.types';
import './ArchiveDetailPage.css';

interface ArchiveDetailPageProps {
  archiveId: string | null;
  onAddItem?: (input: CreateArchiveItemInput) => Promise<void>;
  onLoadCollection?: (archiveId: string) => Promise<ArchiveCollectionDetail | null>;
}

interface ItemFormState {
  entityId: string;
  displayTitle: string;
  position: string;
  note: string;
}

const initialItemForm: ItemFormState = {
  entityId: '',
  displayTitle: '',
  position: '',
  note: '',
};

export function ArchiveDetailPage({
  archiveId,
  onAddItem = addArchiveItem,
  onLoadCollection = getArchiveCollectionById,
}: ArchiveDetailPageProps) {
  const { t } = useI18n();
  const [collection, setCollection] = useState<ArchiveCollectionDetail | null>(null);
  const [form, setForm] = useState<ItemFormState>(initialItemForm);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadCollection() {
    if (!archiveId) {
      setCollection(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      setCollection(await onLoadCollection(archiveId));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('archiveDetail.loadError'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCollection();
  }, [archiveId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!archiveId) {
      return;
    }

    const parsedPosition = Number.parseInt(form.position, 10);
    await onAddItem({
      collectionId: archiveId,
      entityType: 'album',
      entityId: form.entityId.trim(),
      displayTitle: form.displayTitle.trim(),
      position: Number.isNaN(parsedPosition) ? null : parsedPosition,
      note: form.note.trim(),
      externalSource: null,
      externalId: null,
    });
    setForm(initialItemForm);
    await loadCollection();
  }

  if (isLoading) {
    return <p>{t('archiveDetail.loading')}</p>;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  if (!collection) {
    return <p>{t('archiveDetail.notFound')}</p>;
  }

  return (
    <section className="archive-detail-page">
      <a href="#archive">{t('archiveDetail.backToArchive')}</a>
      <p className="eyebrow">{t('archiveDetail.eyebrow')}</p>
      <h1>{collection.title}</h1>
      <dl className="archive-detail-meta">
        <div>
          <dt>{t('archive.sourceLabel')}</dt>
          <dd>{collection.source}</dd>
        </div>
        {collection.sourceUrl ? (
          <div>
            <dt>{t('archive.sourceUrlLabel')}</dt>
            <dd>
              <a href={collection.sourceUrl}>{collection.sourceUrl}</a>
            </dd>
          </div>
        ) : null}
      </dl>
      {collection.description ? <p>{collection.description}</p> : null}

      <form className="archive-detail-form" onSubmit={handleSubmit}>
        <h2>{t('archiveDetail.addAlbumItemTitle')}</h2>
        <label>
          {t('archiveDetail.albumIdLabel')}
          <input
            required
            value={form.entityId}
            onChange={(event) => setForm((current) => ({ ...current, entityId: event.target.value }))}
          />
        </label>
        <label>
          {t('archiveDetail.displayTitleLabel')}
          <input
            required
            value={form.displayTitle}
            onChange={(event) => setForm((current) => ({ ...current, displayTitle: event.target.value }))}
          />
        </label>
        <label>
          {t('archiveDetail.positionLabel')}
          <input
            min="1"
            type="number"
            value={form.position}
            onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))}
          />
        </label>
        <label>
          {t('archiveDetail.noteLabel')}
          <textarea
            value={form.note}
            onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
          />
        </label>
        <button type="submit">{t('archiveDetail.addAlbumItemSubmit')}</button>
      </form>

      <div className="archive-detail-items">
        <h2>{t('archiveDetail.itemsTitle')}</h2>
        {collection.items.length === 0 ? <p>{t('archiveDetail.itemsEmpty')}</p> : null}
        {collection.items.map((item) => (
          <article key={item.id}>
            <h3>{item.displayTitle}</h3>
            {item.position ? <p>#{item.position}</p> : null}
            {item.note ? <p>{item.note}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
