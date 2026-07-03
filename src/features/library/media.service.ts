import { getSupabase } from '../../lib/supabase';
import {
  CreateMediaAssetInput,
  MediaAssetSummary,
  MediaLinkEntityType,
  MediaLinkSummary,
  MediaType,
  UpdateMediaAssetInput,
  UpdateMediaLinkInput,
} from './media.types';

interface MediaLinkRow {
  id: string;
  entity_type: string;
  entity_id: string;
}

interface MediaAssetRow {
  id: string;
  file_name: string;
  media_type: string;
  storage_bucket: string;
  storage_path: string;
  notes: string;
  created_at: string;
  media_links?: MediaLinkRow[] | MediaLinkRow | null;
}

const mediaTypes: MediaType[] = ['video', 'audio', 'pdf', 'gp', 'image', 'backing_track', 'link'];
const linkEntityTypes: MediaLinkEntityType[] = ['song', 'practice_session', 'artist', 'album'];
const demoSessionStorageKey = 'rockroll.demoSession';
const demoMediaAssetsStorageKey = 'rockroll.demoMediaAssets';

function toMediaType(mediaType: string): MediaType {
  return mediaTypes.includes(mediaType as MediaType) ? (mediaType as MediaType) : 'link';
}

function toLinkEntityType(entityType: string): MediaLinkEntityType {
  return linkEntityTypes.includes(entityType as MediaLinkEntityType) ? (entityType as MediaLinkEntityType) : 'song';
}

function mapLinks(links: MediaAssetRow['media_links']): MediaLinkSummary[] {
  const normalizedLinks = Array.isArray(links) ? links : links ? [links] : [];

  return normalizedLinks.map((link) => ({
    id: link.id,
    entityType: toLinkEntityType(link.entity_type),
    entityId: link.entity_id,
  }));
}

function mapMediaAssetRow(asset: MediaAssetRow): MediaAssetSummary {
  return {
    id: asset.id,
    fileName: asset.file_name,
    mediaType: toMediaType(asset.media_type),
    storageBucket: asset.storage_bucket,
    storagePath: asset.storage_path,
    notes: asset.notes,
    createdAt: asset.created_at,
    links: mapLinks(asset.media_links),
  };
}

function isMissingSupabaseEnvError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith('Missing VITE_SUPABASE_');
}

function hasDemoSession(): boolean {
  return Boolean(window.localStorage.getItem(demoSessionStorageKey));
}

function readDemoMediaAssets(): MediaAssetSummary[] {
  const storedAssets = window.localStorage.getItem(demoMediaAssetsStorageKey);
  return storedAssets ? (JSON.parse(storedAssets) as MediaAssetSummary[]) : [];
}

function writeDemoMediaAssets(assets: MediaAssetSummary[]) {
  window.localStorage.setItem(demoMediaAssetsStorageKey, JSON.stringify(assets));
}

export async function listMediaAssets(): Promise<MediaAssetSummary[]> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      return readDemoMediaAssets();
    }
    throw caughtError;
  }

  const { data, error } = await supabase
    .from('media_assets')
    .select('id,file_name,media_type,storage_bucket,storage_path,notes,created_at,media_links(id,entity_type,entity_id)')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as MediaAssetRow[]).map(mapMediaAssetRow);
}

export async function createMediaAsset(input: CreateMediaAssetInput): Promise<void> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      if (!hasDemoSession()) {
        throw new Error('Sign in before adding media assets.');
      }
      const mediaAssetId = `local-media-${Date.now()}`;
      writeDemoMediaAssets([
        {
          id: mediaAssetId,
          fileName: input.fileName,
          mediaType: input.mediaType,
          storageBucket: input.storageBucket,
          storagePath: input.storagePath,
          notes: input.notes,
          createdAt: new Date().toISOString(),
          links: input.link
            ? [
                {
                  id: `local-media-link-${Date.now()}`,
                  entityType: input.link.entityType,
                  entityId: input.link.entityId,
                },
              ]
            : [],
        },
        ...readDemoMediaAssets(),
      ]);
      return;
    }
    throw caughtError;
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  const userId = sessionData.session?.user?.id;

  if (!userId) {
    throw new Error('Sign in before adding media assets.');
  }

  const { data: mediaData, error: mediaError } = await supabase
    .from('media_assets')
    .insert({
      user_id: userId,
      file_name: input.fileName,
      media_type: input.mediaType,
      storage_bucket: input.storageBucket,
      storage_path: input.storagePath,
      notes: input.notes,
    })
    .select('id')
    .single();

  if (mediaError) {
    throw new Error(mediaError.message);
  }

  if (input.link) {
    const { error: linkError } = await supabase.from('media_links').insert({
      user_id: userId,
      media_asset_id: (mediaData as { id: string }).id,
      entity_type: input.link.entityType,
      entity_id: input.link.entityId,
    });

    if (linkError) {
      throw new Error(linkError.message);
    }
  }
}

export async function updateMediaAsset(mediaAssetId: string, input: UpdateMediaAssetInput): Promise<void> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      if (!hasDemoSession()) {
        throw new Error('Sign in before editing media assets.');
      }
      writeDemoMediaAssets(
        readDemoMediaAssets().map((asset) =>
          asset.id === mediaAssetId
            ? {
                ...asset,
                fileName: input.fileName,
                mediaType: input.mediaType,
                storageBucket: input.storageBucket,
                storagePath: input.storagePath,
                notes: input.notes,
                links: input.link
                  ? [
                      {
                        id: asset.links[0]?.id ?? `local-media-link-${Date.now()}`,
                        entityType: input.link.entityType,
                        entityId: input.link.entityId,
                      },
                    ]
                  : [],
              }
            : asset,
        ),
      );
      return;
    }
    throw caughtError;
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  const userId = sessionData.session?.user?.id;

  if (!userId) {
    throw new Error('Sign in before editing media assets.');
  }

  const { error: mediaError } = await supabase
    .from('media_assets')
    .update({
      file_name: input.fileName,
      media_type: input.mediaType,
      storage_bucket: input.storageBucket,
      storage_path: input.storagePath,
      notes: input.notes,
    })
    .eq('id', mediaAssetId);

  if (mediaError) {
    throw new Error(mediaError.message);
  }

  const { error: deleteLinkError } = await supabase.from('media_links').delete().eq('media_asset_id', mediaAssetId);

  if (deleteLinkError) {
    throw new Error(deleteLinkError.message);
  }

  if (input.link) {
    const { error: linkError } = await supabase.from('media_links').insert({
      user_id: userId,
      media_asset_id: mediaAssetId,
      entity_type: input.link.entityType,
      entity_id: input.link.entityId,
    });

    if (linkError) {
      throw new Error(linkError.message);
    }
  }
}

export async function deleteMediaAsset(mediaAssetId: string): Promise<void> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      if (!hasDemoSession()) {
        throw new Error('Sign in before deleting media assets.');
      }
      writeDemoMediaAssets(readDemoMediaAssets().filter((asset) => asset.id !== mediaAssetId));
      return;
    }
    throw caughtError;
  }

  const { error } = await supabase.from('media_assets').delete().eq('id', mediaAssetId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateMediaLink(mediaLinkId: string, input: UpdateMediaLinkInput): Promise<void> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      if (!hasDemoSession()) {
        throw new Error('Sign in before editing media links.');
      }
      writeDemoMediaAssets(
        readDemoMediaAssets().map((asset) => ({
          ...asset,
          links: asset.links.map((link) =>
            link.id === mediaLinkId
              ? {
                  ...link,
                  entityType: input.entityType,
                  entityId: input.entityId,
                }
              : link,
          ),
        })),
      );
      return;
    }
    throw caughtError;
  }

  const { error } = await supabase
    .from('media_links')
    .update({
      entity_type: input.entityType,
      entity_id: input.entityId,
    })
    .eq('id', mediaLinkId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteMediaLink(mediaLinkId: string): Promise<void> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      if (!hasDemoSession()) {
        throw new Error('Sign in before deleting media links.');
      }
      writeDemoMediaAssets(
        readDemoMediaAssets().map((asset) => ({
          ...asset,
          links: asset.links.filter((link) => link.id !== mediaLinkId),
        })),
      );
      return;
    }
    throw caughtError;
  }

  const { error } = await supabase.from('media_links').delete().eq('id', mediaLinkId);

  if (error) {
    throw new Error(error.message);
  }
}
