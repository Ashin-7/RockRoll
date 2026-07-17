import { getSupabase } from '../../lib/supabase';
import {
  ArchiveCollectionDetail,
  ArchiveCollectionSummary,
  ArchiveEntityType,
  ArchiveItemSummary,
  ArchiveCountSummary,
  CreateArchiveCollectionInput,
  CreateArchiveItemInput,
  UpdateArchiveCollectionInput,
  UpdateArchiveItemInput,
} from './archive.types';

interface ArchiveCollectionRow {
  id: string;
  title: string;
  source: string;
  source_url: string;
  description: string;
  collection_type: string;
}

interface ArchiveItemRow {
  id: string;
  entity_type: string;
  entity_id: string;
  display_title: string;
  position: number | null;
  note: string;
  external_source: string | null;
  external_id: string | null;
}

interface ExternalSourceRow {
  entity_id: string;
  raw_payload: unknown;
}

interface DemoArchiveItem extends ArchiveItemSummary {
  collectionId: string;
}

interface ProfileRoleRow {
  role: string;
}

const entityTypes: ArchiveEntityType[] = ['artist', 'album', 'song'];
const demoSessionStorageKey = 'rockroll.demoSession';
const demoCollectionsStorageKey = 'rockroll.demoArchiveCollections';
const demoItemsStorageKey = 'rockroll.demoArchiveItems';

function toEntityType(entityType: string): ArchiveEntityType {
  return entityTypes.includes(entityType as ArchiveEntityType) ? (entityType as ArchiveEntityType) : 'album';
}

function mapCollectionRow(collection: ArchiveCollectionRow): ArchiveCollectionSummary {
  return {
    id: collection.id,
    title: collection.title,
    source: collection.source,
    sourceUrl: collection.source_url,
    description: collection.description,
    collectionType: collection.collection_type,
  };
}

function mapItemRow(item: ArchiveItemRow): ArchiveItemSummary {
  return {
    id: item.id,
    entityType: toEntityType(item.entity_type),
    entityId: item.entity_id,
    displayTitle: item.display_title,
    position: item.position,
    note: item.note,
    externalSource: item.external_source,
    externalId: item.external_id,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function mapAlbumMetadataRows(rows: ExternalSourceRow[]): Map<string, NonNullable<ArchiveItemSummary['albumMetadata']>> {
  return new Map(
    rows.map((row) => {
      const payload = isRecord(row.raw_payload) ? row.raw_payload : {};
      const metadata = isRecord(payload.metadata) ? payload.metadata : {};

      return [
        row.entity_id,
        {
          coverUrl: readString(metadata.coverUrl),
          releaseYear: readNumberOrNull(metadata.releaseYear),
          styles: readStringArray(metadata.styles),
          note: readString(metadata.note),
        },
      ];
    }),
  );
}

function isMissingSupabaseEnvError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith('Missing VITE_SUPABASE_');
}

function hasDemoSession(): boolean {
  return Boolean(window.localStorage.getItem(demoSessionStorageKey));
}

function readDemoCollections(): ArchiveCollectionSummary[] {
  const storedCollections = window.localStorage.getItem(demoCollectionsStorageKey);
  return storedCollections ? (JSON.parse(storedCollections) as ArchiveCollectionSummary[]) : [];
}

function writeDemoCollections(collections: ArchiveCollectionSummary[]) {
  window.localStorage.setItem(demoCollectionsStorageKey, JSON.stringify(collections));
}

function readDemoItems(): DemoArchiveItem[] {
  const storedItems = window.localStorage.getItem(demoItemsStorageKey);
  return storedItems ? (JSON.parse(storedItems) as DemoArchiveItem[]) : [];
}

function writeDemoItems(items: DemoArchiveItem[]) {
  window.localStorage.setItem(demoItemsStorageKey, JSON.stringify(items));
}

async function requireArchiveAdmin(
  supabase: ReturnType<typeof getSupabase>,
  signInMessage: string,
  permissionMessage: string,
): Promise<string> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  const userId = sessionData.session?.user?.id;

  if (!userId) {
    throw new Error(signInMessage);
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if ((profileData as ProfileRoleRow | null)?.role !== 'admin') {
    throw new Error(permissionMessage);
  }

  return userId;
}

export async function getArchiveSummary(): Promise<ArchiveCountSummary> {
  return {
    artists: 0,
    albums: 0,
    genres: 0,
  };
}

export async function listArchiveCollections(): Promise<ArchiveCollectionSummary[]> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      return readDemoCollections();
    }
    throw caughtError;
  }

  const { data, error } = await supabase
    .from('archive_collections')
    .select('id,title,source,source_url,description,collection_type')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ArchiveCollectionRow[]).map(mapCollectionRow);
}

export async function createArchiveCollection(input: CreateArchiveCollectionInput): Promise<void> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      if (!hasDemoSession()) {
        throw new Error('Sign in before adding archive collections.');
      }
      writeDemoCollections([
        {
          id: `local-archive-${Date.now()}`,
          title: input.title,
          source: input.source,
          sourceUrl: input.sourceUrl,
          description: input.description,
          collectionType: input.collectionType,
        },
        ...readDemoCollections(),
      ]);
      return;
    }
    throw caughtError;
  }

  const userId = await requireArchiveAdmin(
    supabase,
    'Sign in before adding archive collections.',
    'Admin permission is required to manage archive collections.',
  );

  const { error } = await supabase.from('archive_collections').insert({
    user_id: userId,
    title: input.title,
    source: input.source,
    source_url: input.sourceUrl,
    description: input.description,
    collection_type: input.collectionType,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateArchiveCollection(
  collectionId: string,
  input: UpdateArchiveCollectionInput,
): Promise<void> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      if (!hasDemoSession()) {
        throw new Error('Sign in before editing archive collections.');
      }
      writeDemoCollections(
        readDemoCollections().map((collection) =>
          collection.id === collectionId
            ? {
                ...collection,
                title: input.title,
                source: input.source,
                sourceUrl: input.sourceUrl,
                description: input.description,
                collectionType: input.collectionType,
              }
            : collection,
        ),
      );
      return;
    }
    throw caughtError;
  }

  await requireArchiveAdmin(
    supabase,
    'Sign in before editing archive collections.',
    'Admin permission is required to manage archive collections.',
  );

  const { error } = await supabase
    .from('archive_collections')
    .update({
      title: input.title,
      source: input.source,
      source_url: input.sourceUrl,
      description: input.description,
      collection_type: input.collectionType,
    })
    .eq('id', collectionId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteArchiveCollection(collectionId: string): Promise<void> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      if (!hasDemoSession()) {
        throw new Error('Sign in before deleting archive collections.');
      }
      writeDemoCollections(readDemoCollections().filter((collection) => collection.id !== collectionId));
      writeDemoItems(readDemoItems().filter((item) => item.collectionId !== collectionId));
      return;
    }
    throw caughtError;
  }

  await requireArchiveAdmin(
    supabase,
    'Sign in before deleting archive collections.',
    'Admin permission is required to manage archive collections.',
  );

  const { error } = await supabase.from('archive_collections').delete().eq('id', collectionId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getArchiveCollectionById(collectionId: string): Promise<ArchiveCollectionDetail | null> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      const collection = readDemoCollections().find((demoCollection) => demoCollection.id === collectionId);
      return collection
        ? {
            ...collection,
            items: readDemoItems()
              .filter((item) => item.collectionId === collectionId)
              .sort(
                (left, right) =>
                  (left.position ?? Number.MAX_SAFE_INTEGER) - (right.position ?? Number.MAX_SAFE_INTEGER),
              )
              .map(({ collectionId: _collectionId, ...item }) => item),
          }
        : null;
    }
    throw caughtError;
  }

  const { data: collectionData, error: collectionError } = await supabase
    .from('archive_collections')
    .select('id,title,source,source_url,description,collection_type')
    .eq('id', collectionId)
    .maybeSingle();

  if (collectionError) {
    throw new Error(collectionError.message);
  }

  if (!collectionData) {
    return null;
  }

  const { data: itemData, error: itemError } = await supabase
    .from('archive_items')
    .select('id,entity_type,entity_id,display_title,position,note,external_source,external_id')
    .eq('collection_id', collectionId)
    .order('position', { ascending: true, nullsFirst: false });

  if (itemError) {
    throw new Error(itemError.message);
  }

  const items = ((itemData ?? []) as ArchiveItemRow[]).map(mapItemRow);
  const albumEntityIds = Array.from(
    new Set(items.filter((item) => item.entityType === 'album').map((item) => item.entityId)),
  );
  let albumMetadataByEntityId = new Map<string, NonNullable<ArchiveItemSummary['albumMetadata']>>();

  if (albumEntityIds.length > 0) {
    const { data: externalSourceData, error: externalSourceError } = await supabase
      .from('external_sources')
      .select('entity_id,raw_payload')
      .eq('entity_type', 'album')
      .in('entity_id', albumEntityIds);

    if (externalSourceError) {
      throw new Error(externalSourceError.message);
    }

    albumMetadataByEntityId = mapAlbumMetadataRows((externalSourceData ?? []) as ExternalSourceRow[]);
  }

  return {
    ...mapCollectionRow(collectionData as ArchiveCollectionRow),
    items: items.map((item) =>
      albumMetadataByEntityId.has(item.entityId)
        ? {
            ...item,
            albumMetadata: albumMetadataByEntityId.get(item.entityId) ?? null,
          }
        : item,
    ),
  };
}

export async function addArchiveItem(input: CreateArchiveItemInput): Promise<void> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      if (!hasDemoSession()) {
        throw new Error('Sign in before adding archive items.');
      }
      writeDemoItems([
        {
          id: `local-archive-item-${Date.now()}`,
          collectionId: input.collectionId,
          entityType: input.entityType,
          entityId: input.entityId,
          displayTitle: input.displayTitle,
          position: input.position,
          note: input.note,
          externalSource: input.externalSource,
          externalId: input.externalId,
        },
        ...readDemoItems(),
      ]);
      return;
    }
    throw caughtError;
  }

  const userId = await requireArchiveAdmin(
    supabase,
    'Sign in before adding archive items.',
    'Admin permission is required to manage archive items.',
  );

  const { error } = await supabase.from('archive_items').insert({
    user_id: userId,
    collection_id: input.collectionId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    display_title: input.displayTitle,
    position: input.position,
    note: input.note,
    external_source: input.externalSource,
    external_id: input.externalId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateArchiveItem(input: UpdateArchiveItemInput): Promise<void> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      const items = readDemoItems().map((item) =>
        item.id === input.itemId
          ? {
              ...item,
              entityType: input.entityType,
              entityId: input.entityId,
              displayTitle: input.displayTitle,
              position: input.position,
              note: input.note,
              externalSource: input.externalSource,
              externalId: input.externalId,
            }
          : item,
      );
      writeDemoItems(items);
      return;
    }
    throw caughtError;
  }

  await requireArchiveAdmin(
    supabase,
    'Sign in before editing archive items.',
    'Admin permission is required to manage archive items.',
  );

  const { error } = await supabase
    .from('archive_items')
    .update({
      entity_type: input.entityType,
      entity_id: input.entityId,
      display_title: input.displayTitle,
      position: input.position,
      note: input.note,
      external_source: input.externalSource,
      external_id: input.externalId,
    })
    .eq('id', input.itemId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteArchiveItem(itemId: string): Promise<void> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      writeDemoItems(readDemoItems().filter((item) => item.id !== itemId));
      return;
    }
    throw caughtError;
  }

  await requireArchiveAdmin(
    supabase,
    'Sign in before deleting archive items.',
    'Admin permission is required to manage archive items.',
  );

  const { error } = await supabase.from('archive_items').delete().eq('id', itemId);

  if (error) {
    throw new Error(error.message);
  }
}
