import { FormEvent, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { createMediaAsset, listMediaAssets } from './media.service';
import { CreateMediaAssetInput, MediaAssetSummary, MediaLinkEntityType, MediaType } from './media.types';
import './LibraryPage.css';

interface LibraryPageProps {
  onCreateMediaAsset?: (input: CreateMediaAssetInput) => Promise<void>;
  onLoadMediaAssets?: () => Promise<MediaAssetSummary[]>;
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
  onLoadMediaAssets = listMediaAssets,
}: LibraryPageProps) {
  const { t } = useI18n();
  const [mediaAssets, setMediaAssets] = useState<MediaAssetSummary[]>([]);
  const [form, setForm] = useState<MediaFormState>(initialForm);
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
    await onCreateMediaAsset({
      fileName: form.fileName.trim(),
      mediaType: form.mediaType,
      storageBucket: form.storageBucket.trim() || 'external',
      storagePath: form.storagePath.trim(),
      notes: form.notes.trim(),
      link,
    });
    setForm(initialForm);
    setMessage(t('library.addSuccess'));
    await loadMediaAssets();
  }

  return (
    <section className="library-page">
      <p className="eyebrow">{t('library.eyebrow')}</p>
      <h1>{t('library.title')}</h1>
      <div className="library-categories">
        <article>
          <h2>{t('library.videos')}</h2>
          <p>{t('library.videosDescription')}</p>
        </article>
        <article>
          <h2>{t('library.scores')}</h2>
          <p>{t('library.scoresDescription')}</p>
        </article>
        <article>
          <h2>{t('library.audio')}</h2>
          <p>{t('library.audioDescription')}</p>
        </article>
      </div>

      <div className="library-workspace">
        <form className="library-form" onSubmit={handleSubmit}>
          <h2>{t('library.addTitle')}</h2>
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
          <label>
            {t('library.notesLabel')}
            <textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </label>
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
          <button type="submit">{t('library.addSubmit')}</button>
          {message ? <p role="status">{message}</p> : null}
        </form>

        <div className="library-assets">
          <h2>{t('library.assetsTitle')}</h2>
          {isLoading ? <p>{t('library.loading')}</p> : null}
          {error ? <p role="alert">{error}</p> : null}
          {!isLoading && !error && mediaAssets.length === 0 ? <p>{t('library.empty')}</p> : null}
          <div className="library-asset-list">
            {mediaAssets.map((asset) => (
              <article key={asset.id}>
                <h3>{asset.fileName}</h3>
                <p>{asset.mediaType}</p>
                <p>{asset.storagePath}</p>
                {asset.notes ? <p>{asset.notes}</p> : null}
                {asset.links.map((link) => (
                  <p key={link.id}>
                    {link.entityType}: {link.entityId}
                  </p>
                ))}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
