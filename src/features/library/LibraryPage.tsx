import { FormEvent, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import {
  createMediaAsset,
  deleteMediaAsset,
  deleteMediaLink,
  listMediaAssets,
  updateMediaAsset,
  updateMediaLink,
} from './media.service';
import {
  CreateMediaAssetInput,
  MediaAssetSummary,
  MediaLinkEntityType,
  MediaLinkSummary,
  MediaType,
  UpdateMediaAssetInput,
  UpdateMediaLinkInput,
} from './media.types';
import './LibraryPage.css';

interface LibraryPageProps {
  onCreateMediaAsset?: (input: CreateMediaAssetInput) => Promise<void>;
  onDeleteMediaAsset?: (mediaAssetId: string) => Promise<void>;
  onDeleteMediaLink?: (mediaLinkId: string) => Promise<void>;
  onLoadMediaAssets?: () => Promise<MediaAssetSummary[]>;
  onUpdateMediaAsset?: (mediaAssetId: string, input: UpdateMediaAssetInput) => Promise<void>;
  onUpdateMediaLink?: (mediaLinkId: string, input: UpdateMediaLinkInput) => Promise<void>;
}

interface MediaFormState {
  fileName: string;
  mediaType: MediaType;
  storageBucket: string;
  storagePath: string;
  notes: string;
  linkedEntityType: '' | MediaLinkEntityType;
  linkedEntityId: string;
}

interface MediaLinkFormState {
  entityType: MediaLinkEntityType;
  entityId: string;
}

const mediaTypes: MediaType[] = ['video', 'audio', 'pdf', 'gp', 'image', 'backing_track', 'link'];
const linkEntityTypes: MediaLinkEntityType[] = ['song', 'practice_session', 'artist', 'album'];

const initialForm: MediaFormState = {
  fileName: '',
  mediaType: 'link',
  storageBucket: '',
  storagePath: '',
  notes: '',
  linkedEntityType: '',
  linkedEntityId: '',
};

export function LibraryPage({
  onCreateMediaAsset = createMediaAsset,
  onDeleteMediaAsset = deleteMediaAsset,
  onDeleteMediaLink = deleteMediaLink,
  onLoadMediaAssets = listMediaAssets,
  onUpdateMediaAsset = updateMediaAsset,
  onUpdateMediaLink = updateMediaLink,
}: LibraryPageProps) {
  const { t } = useI18n();
  const [mediaAssets, setMediaAssets] = useState<MediaAssetSummary[]>([]);
  const [form, setForm] = useState<MediaFormState>(initialForm);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [linkForm, setLinkForm] = useState<MediaLinkFormState>({ entityType: 'song', entityId: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadMediaAssets() {
    setIsLoading(true);
    setError(null);
    try {
      setMediaAssets(await onLoadMediaAssets());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('library.loadError'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadMediaAssets();
  }, []);

  const linkedAssetCount = mediaAssets.filter((asset) => asset.links.length > 0).length;
  const mediaTypeCount = new Set(mediaAssets.map((asset) => asset.mediaType)).size;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const linkedEntityId = form.linkedEntityId.trim();
    const link =
      form.linkedEntityType && linkedEntityId
        ? {
            entityType: form.linkedEntityType,
            entityId: linkedEntityId,
          }
        : null;

    setMessage(null);
    const input = {
      fileName: form.fileName.trim(),
      mediaType: form.mediaType,
      storageBucket: form.storageBucket.trim() || 'external',
      storagePath: form.storagePath.trim(),
      notes: form.notes.trim(),
      link,
    };
    if (editingAssetId) {
      await onUpdateMediaAsset(editingAssetId, input);
    } else {
      await onCreateMediaAsset(input);
    }
    setForm(initialForm);
    setEditingAssetId(null);
    setMessage(editingAssetId ? t('library.updateSuccess') : t('library.addSuccess'));
    await loadMediaAssets();
  }

  async function handleLinkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingLinkId) {
      return;
    }

    setMessage(null);
    await onUpdateMediaLink(editingLinkId, {
      entityType: linkForm.entityType,
      entityId: linkForm.entityId.trim(),
    });
    setEditingLinkId(null);
    setLinkForm({ entityType: 'song', entityId: '' });
    setMessage(t('library.linkUpdateSuccess'));
    await loadMediaAssets();
  }

  function handleEdit(asset: MediaAssetSummary) {
    const firstLink = asset.links[0];
    setEditingAssetId(asset.id);
    setMessage(null);
    setForm({
      fileName: asset.fileName,
      mediaType: asset.mediaType,
      storageBucket: asset.storageBucket,
      storagePath: asset.storagePath,
      notes: asset.notes,
      linkedEntityType: firstLink?.entityType ?? '',
      linkedEntityId: firstLink?.entityId ?? '',
    });
  }

  function handleEditLink(link: MediaLinkSummary) {
    setEditingLinkId(link.id);
    setMessage(null);
    setLinkForm({
      entityType: link.entityType,
      entityId: link.entityId,
    });
  }

  async function handleDelete(asset: MediaAssetSummary) {
    setMessage(null);
    await onDeleteMediaAsset(asset.id);
    if (editingAssetId === asset.id) {
      setEditingAssetId(null);
      setForm(initialForm);
    }
    setMessage(t('library.deleteSuccess'));
    await loadMediaAssets();
  }

  async function handleDeleteLink(linkId: string) {
    setMessage(null);
    await onDeleteMediaLink(linkId);
    if (editingLinkId === linkId) {
      setEditingLinkId(null);
      setLinkForm({ entityType: 'song', entityId: '' });
    }
    setMessage(t('library.linkDeleteSuccess'));
    await loadMediaAssets();
  }

  return (
    <section className="library-page">
      <div className="library-hero">
        <div>
          <p className="eyebrow">{t('library.eyebrow')}</p>
          <h1>{t('library.title')}</h1>
        </div>
        <div className="library-signals" aria-label={t('library.assetIndex')}>
          <article>
            <span>{t('library.totalAssets')}</span>
            <strong>{mediaAssets.length}</strong>
          </article>
          <article>
            <span>{t('library.linkedAssets')}</span>
            <strong>{linkedAssetCount}</strong>
          </article>
          <article>
            <span>{t('library.mediaTypesFiled')}</span>
            <strong>{mediaTypeCount}</strong>
          </article>
        </div>
      </div>

      <section className="library-categories" aria-label={t('library.librarySectionsLabel')}>
        <h2 className="library-section-title">{t('library.librarySectionsLabel')}</h2>
        <article>
          <span>{t('library.videos')}</span>
          <p>{t('library.videosDescription')}</p>
        </article>
        <article>
          <span>{t('library.scores')}</span>
          <p>{t('library.scoresDescription')}</p>
        </article>
        <article>
          <span>{t('library.audio')}</span>
          <p>{t('library.audioDescription')}</p>
        </article>
      </section>

      <div className="library-workspace">
        <form className="library-form" onSubmit={handleSubmit}>
          <div className="library-form-heading">
            <span>{editingAssetId ? t('library.editMode') : t('library.formMode')}</span>
            <h2>{editingAssetId ? t('library.editTitle') : t('library.addTitle')}</h2>
          </div>
          <fieldset>
            <legend>{t('library.identitySection')}</legend>
            <label>
              {t('library.fileNameLabel')}
              <input
                required
                value={form.fileName}
                onChange={(event) => setForm((current) => ({ ...current, fileName: event.target.value }))}
              />
            </label>
            <label>
              {t('library.mediaTypeLabel')}
              <select
                value={form.mediaType}
                onChange={(event) => setForm((current) => ({ ...current, mediaType: event.target.value as MediaType }))}
              >
                {mediaTypes.map((mediaType) => (
                  <option key={mediaType} value={mediaType}>
                    {mediaType}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>
          <fieldset>
            <legend>{t('library.storageProfileSection')}</legend>
            <label>
              {t('library.storageBucketLabel')}
              <input
                value={form.storageBucket}
                onChange={(event) => setForm((current) => ({ ...current, storageBucket: event.target.value }))}
              />
            </label>
            <label>
              {t('library.storagePathLabel')}
              <input
                required
                value={form.storagePath}
                onChange={(event) => setForm((current) => ({ ...current, storagePath: event.target.value }))}
              />
            </label>
          </fieldset>
          <fieldset>
            <legend>{t('library.linkSection')}</legend>
            <label>
              {t('library.linkedEntityTypeLabel')}
              <select
                value={form.linkedEntityType}
                onChange={(event) =>
                  setForm((current) => ({ ...current, linkedEntityType: event.target.value as MediaFormState['linkedEntityType'] }))
                }
              >
                <option value="">{t('library.noLinkedEntity')}</option>
                {linkEntityTypes.map((entityType) => (
                  <option key={entityType} value={entityType}>
                    {entityType}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('library.linkedEntityIdLabel')}
              <input
                value={form.linkedEntityId}
                onChange={(event) => setForm((current) => ({ ...current, linkedEntityId: event.target.value }))}
              />
            </label>
            <label className="library-form-notes">
              {t('library.notesLabel')}
              <textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </label>
          </fieldset>
          <div className="library-form-actions">
            {editingAssetId ? (
              <button
                type="button"
                className="library-secondary-action"
                onClick={() => {
                  setEditingAssetId(null);
                  setForm(initialForm);
                  setMessage(null);
                }}
              >
                {t('library.cancelEdit')}
              </button>
            ) : null}
            <button type="submit">{editingAssetId ? t('library.updateSubmit') : t('library.addSubmit')}</button>
          </div>
          {message ? <p role="status">{message}</p> : null}
        </form>

        <div className="library-assets">
          <h2>{t('library.assetsTitle')}</h2>
          {isLoading ? <p>{t('library.loading')}</p> : null}
          {error ? <p role="alert">{error}</p> : null}
          {!isLoading && !error && mediaAssets.length === 0 ? <p>{t('library.empty')}</p> : null}
          {!isLoading && !error && mediaAssets.length > 0 ? (
            <div className="library-table-wrap">
              <table className="library-asset-table">
                <thead>
                  <tr>
                    <th>{t('library.columnAsset')}</th>
                    <th>{t('library.mediaTypeLabel')}</th>
                    <th>{t('library.columnStorage')}</th>
                    <th>{t('library.columnLinkedEntity')}</th>
                    <th>{t('library.columnNotes')}</th>
                    <th>{t('library.columnActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {mediaAssets.map((asset) => (
                    <tr key={asset.id}>
                      <td>
                        <strong>{asset.fileName}</strong>
                      </td>
                      <td>{asset.mediaType}</td>
                      <td>
                        <span>{asset.storageBucket}</span>
                        <small>{asset.storagePath}</small>
                      </td>
                      <td>
                        {asset.links.length > 0 ? (
                          <div className="library-link-list">
                            {asset.links.map((link) => {
                              const linkLabel = `${link.entityType}: ${link.entityId}`;

                              return (
                                <div className="library-link-item" key={link.id}>
                                  {editingLinkId === link.id ? (
                                    <form className="library-link-form" onSubmit={handleLinkSubmit}>
                                      <label>
                                        {t('library.editLinkedEntityTypeLabel')}
                                        <select
                                          value={linkForm.entityType}
                                          onChange={(event) =>
                                            setLinkForm((current) => ({
                                              ...current,
                                              entityType: event.target.value as MediaLinkEntityType,
                                            }))
                                          }
                                        >
                                          {linkEntityTypes.map((entityType) => (
                                            <option key={entityType} value={entityType}>
                                              {entityType}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                      <label>
                                        {t('library.editLinkedEntityIdLabel')}
                                        <input
                                          required
                                          value={linkForm.entityId}
                                          onChange={(event) =>
                                            setLinkForm((current) => ({ ...current, entityId: event.target.value }))
                                          }
                                        />
                                      </label>
                                      <div className="library-link-actions">
                                        <button type="submit">{t('library.updateLinkSubmit')}</button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingLinkId(null);
                                            setLinkForm({ entityType: 'song', entityId: '' });
                                          }}
                                        >
                                          {t('library.cancelEdit')}
                                        </button>
                                      </div>
                                    </form>
                                  ) : (
                                    <>
                                      <span>{linkLabel}</span>
                                      <div className="library-link-actions">
                                        <button
                                          type="button"
                                          aria-label={`${t('library.editLinkAction')} ${linkLabel}`}
                                          onClick={() => handleEditLink(link)}
                                        >
                                          {t('library.editLinkAction')}
                                        </button>
                                        <button
                                          type="button"
                                          aria-label={`${t('library.deleteLinkAction')} ${linkLabel}`}
                                          onClick={() => handleDeleteLink(link.id)}
                                        >
                                          {t('library.deleteLinkAction')}
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          t('library.noLinkedEntity')
                        )}
                      </td>
                      <td>{asset.notes || t('library.noNotes')}</td>
                      <td>
                        <div className="library-row-actions">
                          <button type="button" aria-label={`${t('library.editAction')} ${asset.fileName}`} onClick={() => handleEdit(asset)}>
                            {t('library.editAction')}
                          </button>
                          <button
                            type="button"
                            aria-label={`${t('library.deleteAction')} ${asset.fileName}`}
                            onClick={() => handleDelete(asset)}
                          >
                            {t('library.deleteAction')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
