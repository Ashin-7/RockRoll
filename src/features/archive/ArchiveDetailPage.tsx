import { FormEvent, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { addArchiveItem, deleteArchiveItem, getArchiveCollectionById, updateArchiveItem } from './archive.service';
import { ArchiveCollectionDetail, ArchiveItemSummary, CreateArchiveItemInput, UpdateArchiveItemInput } from './archive.types';
import './ArchiveDetailPage.css';

interface ArchiveDetailPageProps {
  archiveId: string | null;
  onAddItem?: (input: CreateArchiveItemInput) => Promise<void>;
  onDeleteItem?: (itemId: string) => Promise<void>;
  onLoadCollection?: (archiveId: string) => Promise<ArchiveCollectionDetail | null>;
  onUpdateItem?: (input: UpdateArchiveItemInput) => Promise<void>;
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
  onDeleteItem = deleteArchiveItem,
  onLoadCollection = getArchiveCollectionById,
  onUpdateItem = updateArchiveItem,
}: ArchiveDetailPageProps) {
  const { t } = useI18n();
  const [collection, setCollection] = useState<ArchiveCollectionDetail | null>(null);
  const [form, setForm] = useState<ItemFormState>(initialItemForm);
  const [editingItem, setEditingItem] = useState<ArchiveItemSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadCollection() {
    if (!archiveId) {
      setCollection(null);
      setEditingItem(null);
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
    const itemInput = {
      entityType: 'album' as const,
      entityId: form.entityId.trim(),
      displayTitle: form.displayTitle.trim(),
      position: Number.isNaN(parsedPosition) ? null : parsedPosition,
      note: form.note.trim(),
      externalSource: editingItem?.externalSource ?? null,
      externalId: editingItem?.externalId ?? null,
    };

    if (editingItem) {
      await onUpdateItem({
        itemId: editingItem.id,
        ...itemInput,
      });
    } else {
      await onAddItem({
        collectionId: archiveId,
        ...itemInput,
      });
    }
    setForm(initialItemForm);
    setEditingItem(null);
    await loadCollection();
  }

  function handleEditItem(item: ArchiveItemSummary) {
    setEditingItem(item);
    setForm({
      entityId: item.entityId,
      displayTitle: item.displayTitle,
      position: item.position === null ? '' : String(item.position),
      note: item.note,
    });
  }

  async function handleDeleteItem(itemId: string) {
    await onDeleteItem(itemId);
    if (editingItem?.id === itemId) {
      setEditingItem(null);
      setForm(initialItemForm);
    }
    await loadCollection();
  }

  function handleCancelEdit() {
    setEditingItem(null);
    setForm(initialItemForm);
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
      <header className="archive-detail-hero">
        <div>
          <a href="#archive">{t('archiveDetail.backToArchive')}</a>
          <p className="eyebrow">{t('archiveDetail.eyebrow')}</p>
          <h1>{collection.title}</h1>
          {collection.description ? <p>{collection.description}</p> : null}
        </div>
      </header>

      <dl className="archive-detail-stats">
        <div>
          <dt>{t('archive.sourceLabel')}</dt>
          <dd>{collection.source}</dd>
        </div>
        <div>
          <dt>{t('archiveDetail.itemsFiled')}</dt>
          <dd>{collection.items.length}</dd>
        </div>
        <div>
          <dt>{t('archive.sourceUrlLabel')}</dt>
          <dd>
            {collection.sourceUrl ? <a href={collection.sourceUrl}>{collection.sourceUrl}</a> : t('archive.noDescription')}
          </dd>
        </div>
      </dl>

      <div className="archive-detail-layout">
        <section className="archive-detail-items" aria-labelledby="archive-detail-items-title">
          <div className="archive-detail-section-heading">
            <p className="archive-detail-kicker">{t('archiveDetail.itemIndex')}</p>
            <h2 id="archive-detail-items-title">{t('archiveDetail.itemsTitle')}</h2>
          </div>
          {collection.items.length === 0 ? <p>{t('archiveDetail.itemsEmpty')}</p> : null}
          {collection.items.length > 0 ? (
            <div className="archive-detail-table" role="table" aria-label={t('archiveDetail.itemsTitle')}>
              <div className="archive-detail-table-row archive-detail-table-head" role="row">
                <span role="columnheader">{t('archiveDetail.columnItem')}</span>
                <span role="columnheader">{t('archiveDetail.columnPosition')}</span>
                <span role="columnheader">{t('archiveDetail.columnNote')}</span>
                <span role="columnheader">{t('archiveDetail.columnActions')}</span>
              </div>
              {collection.items.map((item) => (
                <article className="archive-detail-table-row" key={item.id} role="row">
                  <h3 role="cell">{item.displayTitle}</h3>
                  <p role="cell">{item.position ? `#${item.position}` : t('archiveDetail.noPosition')}</p>
                  <p role="cell">{item.note || t('archiveDetail.noNote')}</p>
                  <div className="archive-detail-row-actions" role="cell">
                    <button type="button" onClick={() => handleEditItem(item)}>
                      {t('archiveDetail.editAction')}
                    </button>
                    <button type="button" onClick={() => handleDeleteItem(item.id)}>
                      {t('archiveDetail.deleteAction')}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <form className="archive-detail-form" onSubmit={handleSubmit}>
          <div className="archive-detail-form-heading">
            <p className="archive-detail-form-mode">
              {editingItem ? t('archiveDetail.editMode') : t('archiveDetail.formMode')}
            </p>
            <h2>{editingItem ? t('archiveDetail.editAlbumItemTitle') : t('archiveDetail.addAlbumItemTitle')}</h2>
          </div>
          <fieldset>
            <legend>{t('archiveDetail.albumLinkSection')}</legend>
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
          </fieldset>
          <fieldset>
            <legend>{t('archiveDetail.placementSection')}</legend>
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
          </fieldset>
          <div className="archive-detail-form-actions">
            <button type="submit">
              {editingItem ? t('archiveDetail.updateAlbumItemSubmit') : t('archiveDetail.addAlbumItemSubmit')}
            </button>
            {editingItem ? (
              <button type="button" onClick={handleCancelEdit}>
                {t('archiveDetail.cancelEdit')}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  );
}
