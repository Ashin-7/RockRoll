import { FormEvent, useEffect, useState } from 'react';
import {
  ActionBar,
  Button,
  Field,
  FormSection,
  Input,
  Panel,
  Select,
  SectionHeading,
  StatCard,
  Textarea,
} from '../../components/ui';
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
      <Panel as="header" className="library-hero" variant="hero">
        <SectionHeading
          as="h1"
          className="library-hero__heading"
          eyebrow={t('library.eyebrow')}
          title={t('library.title')}
        />
        <div className="library-signals" aria-label={t('library.assetIndex')}>
          <StatCard label={t('library.totalAssets')} value={mediaAssets.length} />
          <StatCard label={t('library.linkedAssets')} value={linkedAssetCount} />
          <StatCard label={t('library.mediaTypesFiled')} value={mediaTypeCount} />
        </div>
      </Panel>

      <section className="library-categories" aria-label={t('library.librarySectionsLabel')}>
        <SectionHeading
          as="h2"
          className="library-section-title"
          title={t('library.librarySectionsLabel')}
        />
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
          <SectionHeading
            as="h2"
            className="library-form-heading"
            eyebrow={editingAssetId ? t('library.editMode') : t('library.formMode')}
            title={editingAssetId ? t('library.editTitle') : t('library.addTitle')}
          />
          <FormSection title={t('library.identitySection')}>
            <Field label={t('library.fileNameLabel')}>
              <Input
                required
                value={form.fileName}
                onChange={(event) => setForm((current) => ({ ...current, fileName: event.target.value }))}
              />
            </Field>
            <Field label={t('library.mediaTypeLabel')}>
              <Select
                options={mediaTypes.map((mediaType) => ({ label: mediaType, value: mediaType }))}
                value={form.mediaType}
                onValueChange={(mediaType) => setForm((current) => ({ ...current, mediaType }))}
              />
            </Field>
          </FormSection>
          <FormSection title={t('library.storageProfileSection')}>
            <Field label={t('library.storageBucketLabel')}>
              <Input
                value={form.storageBucket}
                onChange={(event) => setForm((current) => ({ ...current, storageBucket: event.target.value }))}
              />
            </Field>
            <Field label={t('library.storagePathLabel')}>
              <Input
                required
                value={form.storagePath}
                onChange={(event) => setForm((current) => ({ ...current, storagePath: event.target.value }))}
              />
            </Field>
          </FormSection>
          <FormSection title={t('library.linkSection')}>
            <Field label={t('library.linkedEntityTypeLabel')}>
              <Select
                options={[
                  { label: t('library.noLinkedEntity'), value: '' as const },
                  ...linkEntityTypes.map((entityType) => ({ label: entityType, value: entityType })),
                ]}
                value={form.linkedEntityType}
                onValueChange={(linkedEntityType) => setForm((current) => ({ ...current, linkedEntityType }))}
              />
            </Field>
            <Field label={t('library.linkedEntityIdLabel')}>
              <Input
                value={form.linkedEntityId}
                onChange={(event) => setForm((current) => ({ ...current, linkedEntityId: event.target.value }))}
              />
            </Field>
            <Field className="library-form-notes" label={t('library.notesLabel')}>
              <Textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </Field>
          </FormSection>
          <ActionBar className="library-form-actions">
            {editingAssetId ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingAssetId(null);
                  setForm(initialForm);
                  setMessage(null);
                }}
              >
                {t('library.cancelEdit')}
              </Button>
            ) : null}
            <Button type="submit" variant="primary">
              {editingAssetId ? t('library.updateSubmit') : t('library.addSubmit')}
            </Button>
          </ActionBar>
          {message ? <p role="status">{message}</p> : null}
        </form>

        <div className="library-assets">
          <SectionHeading as="h2" className="library-assets-heading" title={t('library.assetsTitle')} />
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
                                      <Field label={t('library.editLinkedEntityTypeLabel')}>
                                        <Select
                                          options={linkEntityTypes.map((entityType) => ({ label: entityType, value: entityType }))}
                                          value={linkForm.entityType}
                                          onValueChange={(entityType) =>
                                            setLinkForm((current) => ({ ...current, entityType }))
                                          }
                                        />
                                      </Field>
                                      <Field label={t('library.editLinkedEntityIdLabel')}>
                                        <Input
                                          required
                                          value={linkForm.entityId}
                                          onChange={(event) =>
                                            setLinkForm((current) => ({ ...current, entityId: event.target.value }))
                                          }
                                        />
                                      </Field>
                                      <div className="library-link-actions">
                                        <Button type="submit" variant="primary">{t('library.updateLinkSubmit')}</Button>
                                        <Button
                                          type="button"
                                          variant="secondary"
                                          onClick={() => {
                                            setEditingLinkId(null);
                                            setLinkForm({ entityType: 'song', entityId: '' });
                                          }}
                                        >
                                          {t('library.cancelEdit')}
                                        </Button>
                                      </div>
                                    </form>
                                  ) : (
                                    <>
                                      <span>{linkLabel}</span>
                                      <div className="library-link-actions">
                                        <Button
                                          type="button"
                                          variant="secondary"
                                          aria-label={`${t('library.editLinkAction')} ${linkLabel}`}
                                          onClick={() => handleEditLink(link)}
                                        >
                                          {t('library.editLinkAction')}
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          aria-label={`${t('library.deleteLinkAction')} ${linkLabel}`}
                                          onClick={() => handleDeleteLink(link.id)}
                                        >
                                          {t('library.deleteLinkAction')}
                                        </Button>
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
                          <Button
                            type="button"
                            variant="secondary"
                            aria-label={`${t('library.editAction')} ${asset.fileName}`}
                            onClick={() => handleEdit(asset)}
                          >
                            {t('library.editAction')}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            aria-label={`${t('library.deleteAction')} ${asset.fileName}`}
                            onClick={() => handleDelete(asset)}
                          >
                            {t('library.deleteAction')}
                          </Button>
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
