import { FormEvent, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { getCurrentUserImportRole } from '../inbox/inbox.service';
import { ImportUserRole } from '../inbox/inbox.types';
import { addArchiveItem, deleteArchiveItem, getArchiveCollectionById, updateArchiveItem } from './archive.service';
import { ArchiveCollectionDetail, ArchiveItemSummary, CreateArchiveItemInput, UpdateArchiveItemInput } from './archive.types';
import { Button } from '../../components/ui';
import './ArchiveDetailPage.css';

interface ArchiveDetailPageProps {
  archiveId: string | null;
  onAddItem?: (input: CreateArchiveItemInput) => Promise<void>;
  onDeleteItem?: (itemId: string) => Promise<void>;
  onLoadCollection?: (archiveId: string) => Promise<ArchiveCollectionDetail | null>;
  onLoadImportRole?: typeof getCurrentUserImportRole;
  onUpdateItem?: (input: UpdateArchiveItemInput) => Promise<void>;
}

interface ItemFormState {
  entityId: string;
  displayTitle: string;
  position: string;
  note: string;
}

const itemPageSize = 25;

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
  onLoadImportRole = getCurrentUserImportRole,
  onUpdateItem = updateArchiveItem,
}: ArchiveDetailPageProps) {
  const { t } = useI18n();
  const [collection, setCollection] = useState<ArchiveCollectionDetail | null>(null);
  const [form, setForm] = useState<ItemFormState>(initialItemForm);
  const [editingItem, setEditingItem] = useState<ArchiveItemSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemPageIndex, setItemPageIndex] = useState(0);
  const [importRole, setImportRole] = useState<ImportUserRole>('anonymous');

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
      setItemPageIndex(0);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('archiveDetail.loadError'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCollection();
  }, [archiveId]);

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

  const itemPageCount = Math.max(1, Math.ceil(collection.items.length / itemPageSize));
  const safeItemPageIndex = Math.min(itemPageIndex, itemPageCount - 1);
  const currentItemStart = safeItemPageIndex * itemPageSize;
  const currentItemEnd = Math.min(currentItemStart + itemPageSize, collection.items.length);
  const currentItems = collection.items.slice(currentItemStart, currentItemEnd);
  const itemRangeText = t('archiveDetail.itemPaginationRange')
    .replace('{start}', String(collection.items.length === 0 ? 0 : currentItemStart + 1))
    .replace('{end}', String(currentItemEnd))
    .replace('{total}', String(collection.items.length));
  const canManageArchive = importRole === 'admin';

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
            <>
              <div className="archive-detail-pagination" aria-label={t('archiveDetail.itemPaginationLabel')}>
                <p>{itemRangeText}</p>
                <div>
                  <Button
                    type="button"
                    onClick={() => setItemPageIndex((current) => Math.max(0, current - 1))}
                    disabled={safeItemPageIndex === 0}
                  >
                    {t('archiveDetail.previousPage')}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setItemPageIndex((current) => Math.min(itemPageCount - 1, current + 1))}
                    disabled={safeItemPageIndex >= itemPageCount - 1}
                  >
                    {t('archiveDetail.nextPage')}
                  </Button>
                </div>
              </div>
              <div className="archive-detail-item-grid" aria-label={t('archiveDetail.itemsTitle')}>
                {currentItems.map((item) => {
                  const itemNote = item.albumMetadata?.note || item.note;

                  return (
                    <article className="archive-detail-item-card" key={item.id}>
                      <div className="archive-detail-item-card__cover">
                        {item.albumMetadata?.coverUrl ? (
                          <img
                            src={item.albumMetadata.coverUrl}
                            alt={`${item.displayTitle} ${t('archiveDetail.coverAltSuffix')}`}
                            loading="lazy"
                          />
                        ) : (
                          <span>{t('archiveDetail.noCover')}</span>
                        )}
                      </div>
                      <div className="archive-detail-item-card__body">
                        <div>
                          <p className="archive-detail-item-card__position">
                            {item.position ? `#${item.position}` : t('archiveDetail.noPosition')}
                          </p>
                          <h3>{item.displayTitle}</h3>
                        </div>
                        <div
                          className="archive-detail-item-card__meta"
                          aria-label={`${item.displayTitle} ${t('archiveDetail.metadataLabel')}`}
                        >
                          {item.albumMetadata?.releaseYear ? <span>{item.albumMetadata.releaseYear}</span> : null}
                          {item.albumMetadata?.styles.map((styleName) => <span key={styleName}>{styleName}</span>)}
                        </div>
                        <p>{itemNote || t('archiveDetail.noNote')}</p>
                      </div>
                      {canManageArchive ? (
                        <div className="archive-detail-row-actions">
                          <Button type="button" onClick={() => handleEditItem(item)}>
                            {t('archiveDetail.editAction')}
                          </Button>
                          <Button type="button" onClick={() => handleDeleteItem(item.id)}>
                            {t('archiveDetail.deleteAction')}
                          </Button>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </>
          ) : null}
        </section>

        {canManageArchive ? (
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
              <Button variant="primary" type="submit">
                {editingItem ? t('archiveDetail.updateAlbumItemSubmit') : t('archiveDetail.addAlbumItemSubmit')}
              </Button>
              {editingItem ? (
                <Button variant="ghost" type="button" onClick={handleCancelEdit}>
                  {t('archiveDetail.cancelEdit')}
                </Button>
              ) : null}
            </div>
          </form>
        ) : null}
      </div>
    </section>
  );
}
