import { getSupabase } from '../../lib/supabase';
import {
  AlbumCollectionAlbumSummary,
  AlbumCollectionOption,
  AlbumCollectionPageInput,
  AlbumCollectionSummary,
  AlbumDetail,
  AlbumSummary,
  AlbumType,
  CreateAlbumInput,
  UpdateAlbumInput,
} from './album.types';

interface AlbumRow {
  id: string;
  title: string;
  release_year: number | null;
  album_type: string;
  notes: string;
  artists: { name: string } | Array<{ name: string }> | null;
}

interface ArchiveCollectionRow {
  id: string;
  title: string;
  source: string;
  source_url: string;
  description: string;
}

interface ArchiveItemRow {
  collection_id: string;
  entity_id: string;
  position: number | null;
  note: string;
}

interface ExternalSourceRow {
  entity_id: string;
  raw_payload: unknown;
}

interface AlbumExternalMetadata {
  coverUrl: string;
  artistName: string;
  styles: string[];
  reviewNote: string;
}

const albumTypes: AlbumType[] = ['album', 'ep', 'live', 'compilation'];
const supabaseInFilterChunkSize = 200;
const supabaseBatchConcurrency = 3;
const demoSessionStorageKey = 'rockroll.demoSession';
const demoAlbumsStorageKey = 'rockroll.demoAlbums';

function toAlbumType(albumType: string): AlbumType {
  return albumTypes.includes(albumType as AlbumType) ? (albumType as AlbumType) : 'album';
}

function getArtistName(row: AlbumRow): string {
  if (Array.isArray(row.artists)) {
    return row.artists[0]?.name ?? 'Unknown artist';
  }

  return row.artists?.name ?? 'Unknown artist';
}

function mapAlbumRow(album: AlbumRow): AlbumSummary {
  return {
    id: album.id,
    title: album.title,
    artistName: getArtistName(album),
    releaseYear: album.release_year,
    albumType: toAlbumType(album.album_type),
    notes: album.notes,
  };
}

function mapCollectionRow(collection: ArchiveCollectionRow): AlbumCollectionOption {
  return {
    id: collection.id,
    title: collection.title,
    source: collection.source,
    sourceUrl: collection.source_url,
    description: collection.description,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function mapExternalMetadataRows(rows: ExternalSourceRow[]): Map<string, AlbumExternalMetadata> {
  return new Map(
    rows.map((row) => {
      const payload = isRecord(row.raw_payload) ? row.raw_payload : {};
      const metadata = isRecord(payload.metadata) ? payload.metadata : {};

      return [
        row.entity_id,
        {
          coverUrl: readString(metadata.coverUrl),
          artistName: readString(metadata.artistName),
          styles: readStringArray(metadata.styles),
          reviewNote: readString(metadata.note),
        },
      ];
    }),
  );
}

function collectAvailableStyles(rows: ExternalSourceRow[]): string[] {
  return Array.from(
    new Set(
      Array.from(mapExternalMetadataRows(rows).values()).flatMap((metadata) => metadata.styles),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  handler: (item: T) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const currentItem = items[nextIndex];
        nextIndex += 1;
        await handler(currentItem);
      }
    }),
  );
}

function mapFlatAlbumsToCollection(albums: AlbumSummary[]): AlbumCollectionSummary[] {
  if (albums.length === 0) {
    return [];
  }

  return [
    {
      id: 'ungrouped-albums',
      title: 'Ungrouped albums',
      source: 'manual',
      sourceUrl: '',
      description: '',
      albums: albums.map((album) => ({
        ...album,
        rank: null,
        coverUrl: '',
        styles: [],
        reviewNote: album.notes,
      })),
    },
  ];
}

function compareAlbumRank(left: AlbumCollectionAlbumSummary, right: AlbumCollectionAlbumSummary): number {
  if (typeof left.rank === 'number' && typeof right.rank === 'number') {
    return left.rank - right.rank;
  }

  if (typeof left.rank === 'number') {
    return -1;
  }

  if (typeof right.rank === 'number') {
    return 1;
  }

  return 0;
}

function isMissingSupabaseEnvError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith('Missing VITE_SUPABASE_');
}

function hasDemoSession(): boolean {
  return Boolean(window.localStorage.getItem(demoSessionStorageKey));
}

function readDemoAlbums(): AlbumSummary[] {
  const storedAlbums = window.localStorage.getItem(demoAlbumsStorageKey);
  return storedAlbums ? (JSON.parse(storedAlbums) as AlbumSummary[]) : [];
}

function writeDemoAlbums(albums: AlbumSummary[]) {
  window.localStorage.setItem(demoAlbumsStorageKey, JSON.stringify(albums));
}

function findDemoAlbum(albumId: string): AlbumDetail | null {
  return readDemoAlbums().find((demoAlbum) => demoAlbum.id === albumId) ?? null;
}

async function loadAlbumRowsByIds(supabase: ReturnType<typeof getSupabase>, albumIds: string[]): Promise<AlbumRow[]> {
  const albumRows: AlbumRow[] = [];

  await runWithConcurrency(chunkArray(albumIds, supabaseInFilterChunkSize), supabaseBatchConcurrency, async (albumIdChunk) => {
    const { data, error } = await supabase
      .from('albums')
      .select('id,title,release_year,album_type,notes,artists(name)')
      .in('id', albumIdChunk);

    if (error) {
      throw new Error(error.message);
    }

    albumRows.push(...((data ?? []) as AlbumRow[]));
  });

  return albumRows;
}

async function loadExternalSourceRowsByAlbumIds(
  supabase: ReturnType<typeof getSupabase>,
  albumIds: string[],
): Promise<ExternalSourceRow[]> {
  const externalSourceRows: ExternalSourceRow[] = [];

  await runWithConcurrency(chunkArray(albumIds, supabaseInFilterChunkSize), supabaseBatchConcurrency, async (albumIdChunk) => {
    const { data, error } = await supabase
      .from('external_sources')
      .select('entity_id,raw_payload')
      .eq('entity_type', 'album')
      .in('entity_id', albumIdChunk);

    if (error) {
      throw new Error(error.message);
    }

    externalSourceRows.push(...((data ?? []) as ExternalSourceRow[]));
  });

  return externalSourceRows;
}

async function loadCollectionAlbumItems(
  supabase: ReturnType<typeof getSupabase>,
  collectionId: string,
): Promise<ArchiveItemRow[]> {
  const { data, error } = await supabase
    .from('archive_items')
    .select('collection_id,entity_id,position,note')
    .eq('collection_id', collectionId)
    .eq('entity_type', 'album')
    .order('position', { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ArchiveItemRow[];
}

async function buildAlbumCollections(
  supabase: ReturnType<typeof getSupabase>,
  collections: ArchiveCollectionRow[],
  items: ArchiveItemRow[],
  totalAlbumCountByCollectionId: Record<string, number> = {},
  externalSourceRows?: ExternalSourceRow[],
): Promise<AlbumCollectionSummary[]> {
  const albumIds = Array.from(new Set(items.map((item) => item.entity_id)));
  if (albumIds.length === 0) {
    return collections.map((collection) => ({
      ...mapCollectionRow(collection),
      totalAlbumCount: totalAlbumCountByCollectionId[collection.id] ?? 0,
      albums: [],
    }));
  }

  const [albumRows, resolvedExternalSourceRows] = await Promise.all([
    loadAlbumRowsByIds(supabase, albumIds),
    externalSourceRows ? Promise.resolve(externalSourceRows) : loadExternalSourceRowsByAlbumIds(supabase, albumIds),
  ]);
  const albumsById = new Map(albumRows.map((album) => [album.id, mapAlbumRow(album)]));
  const metadataByAlbumId = mapExternalMetadataRows(resolvedExternalSourceRows);
  const availableStyles = collectAvailableStyles(resolvedExternalSourceRows);
  const itemsByCollectionId = items.reduce<Record<string, AlbumCollectionAlbumSummary[]>>((groupedItems, item) => {
    const album = albumsById.get(item.entity_id);
    if (!album) {
      return groupedItems;
    }

    const metadata = metadataByAlbumId.get(item.entity_id);
    return {
      ...groupedItems,
      [item.collection_id]: [
        ...(groupedItems[item.collection_id] ?? []),
        {
          ...album,
          artistName: metadata?.artistName || album.artistName,
          rank: item.position,
          coverUrl: metadata?.coverUrl ?? '',
          styles: metadata?.styles ?? [],
          reviewNote: metadata?.reviewNote || item.note || album.notes,
        },
      ],
    };
  }, {});

  return collections.map((collection) => ({
    ...mapCollectionRow(collection),
    totalAlbumCount: totalAlbumCountByCollectionId[collection.id] ?? itemsByCollectionId[collection.id]?.length ?? 0,
    availableStyles,
    albums: [...(itemsByCollectionId[collection.id] ?? [])].sort(compareAlbumRank),
  }));
}

export async function listAlbumCollectionOptions(): Promise<AlbumCollectionOption[]> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      return mapFlatAlbumsToCollection(readDemoAlbums()).map(({ albums: _albums, ...collection }) => collection);
    }
    throw caughtError;
  }

  const { data, error } = await supabase
    .from('archive_collections')
    .select('id,title,source,source_url,description')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ArchiveCollectionRow[]).map(mapCollectionRow);
}

export async function getAlbumCollectionById(
  collectionId: string,
  page?: AlbumCollectionPageInput,
): Promise<AlbumCollectionSummary | null> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      const collection = mapFlatAlbumsToCollection(readDemoAlbums()).find((demoCollection) => demoCollection.id === collectionId);
      if (!collection) {
        return null;
      }
      if (!page) {
        return { ...collection, totalAlbumCount: collection.albums.length };
      }
      const start = page.pageIndex * page.pageSize;
      return {
        ...collection,
        totalAlbumCount: collection.albums.length,
        albums: collection.albums.slice(start, start + page.pageSize),
      };
    }
    throw caughtError;
  }

  const { data: collectionData, error: collectionError } = await supabase
    .from('archive_collections')
    .select('id,title,source,source_url,description')
    .eq('id', collectionId);

  if (collectionError) {
    throw new Error(collectionError.message);
  }

  const collection = ((collectionData ?? []) as ArchiveCollectionRow[])[0];
  if (!collection) {
    return null;
  }

  const from = page ? page.pageIndex * page.pageSize : 0;
  const to = page ? from + page.pageSize - 1 : 0;
  const selectedStyle = page?.style?.trim() ?? '';
  let fullCollectionItems: ArchiveItemRow[] | null = null;
  let fullExternalSourceRows: ExternalSourceRow[] | undefined;
  let availableStyles: string[] | undefined;
  let itemRows: ArchiveItemRow[];
  let totalAlbumCount: number;

  if (page) {
    fullCollectionItems = await loadCollectionAlbumItems(supabase, collectionId);
    const fullAlbumIds = Array.from(new Set(fullCollectionItems.map((item) => item.entity_id)));
    fullExternalSourceRows = await loadExternalSourceRowsByAlbumIds(supabase, fullAlbumIds);
    availableStyles = collectAvailableStyles(fullExternalSourceRows);
  }

  if (page && selectedStyle) {
    const metadataByAlbumId = mapExternalMetadataRows(fullExternalSourceRows ?? []);
    const filteredItems = (fullCollectionItems ?? []).filter((item) =>
      metadataByAlbumId.get(item.entity_id)?.styles.includes(selectedStyle),
    );
    itemRows = filteredItems.slice(from, to + 1);
    totalAlbumCount = filteredItems.length;
  } else {
    const itemQuery = supabase
      .from('archive_items')
      .select('collection_id,entity_id,position,note', page ? { count: 'exact' } : undefined)
      .eq('collection_id', collectionId)
      .eq('entity_type', 'album')
      .order('position', { ascending: true, nullsFirst: false });
    const { data: itemData, error: itemError, count } = await (page ? itemQuery.range(from, to) : itemQuery);

    if (itemError) {
      throw new Error(itemError.message);
    }

    itemRows = (itemData ?? []) as ArchiveItemRow[];
    totalAlbumCount = page ? count ?? 0 : itemRows.length;
  }

  const [collectionSummary] = await buildAlbumCollections(supabase, [collection], itemRows, {
    [collection.id]: totalAlbumCount,
  }, fullExternalSourceRows);
  return collectionSummary
    ? {
        ...collectionSummary,
        availableStyles: availableStyles ?? collectionSummary.availableStyles,
      }
    : null;
}

export async function listAlbums(): Promise<AlbumSummary[]> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      return readDemoAlbums();
    }
    throw caughtError;
  }

  const { data, error } = await supabase
    .from('albums')
    .select('id,title,release_year,album_type,notes,artists(name)')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as AlbumRow[]).map(mapAlbumRow);
}

export async function listAlbumCollections(): Promise<AlbumCollectionSummary[]> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      return mapFlatAlbumsToCollection(readDemoAlbums());
    }
    throw caughtError;
  }

  const { data: collectionData, error: collectionError } = await supabase
    .from('archive_collections')
    .select('id,title,source,source_url,description')
    .order('updated_at', { ascending: false });

  if (collectionError) {
    throw new Error(collectionError.message);
  }

  const collections = (collectionData ?? []) as ArchiveCollectionRow[];
  if (collections.length === 0) {
    return [];
  }

  const collectionIds = collections.map((collection) => collection.id);
  const { data: itemData, error: itemError } = await supabase
    .from('archive_items')
    .select('collection_id,entity_id,position,note')
    .in('collection_id', collectionIds)
    .eq('entity_type', 'album')
    .order('position', { ascending: true, nullsFirst: false });

  if (itemError) {
    throw new Error(itemError.message);
  }

  return buildAlbumCollections(supabase, collections, (itemData ?? []) as ArchiveItemRow[]);
}

export async function createAlbum(input: CreateAlbumInput): Promise<void> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      if (!hasDemoSession()) {
        throw new Error('Sign in before adding albums.');
      }
      writeDemoAlbums([
        {
          id: `local-album-${Date.now()}`,
          title: input.title,
          artistName: 'Unknown artist',
          releaseYear: input.releaseYear,
          albumType: input.albumType,
          notes: input.notes,
        },
        ...readDemoAlbums(),
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
    throw new Error('Sign in before adding albums.');
  }

  const { error } = await supabase.from('albums').insert({
    user_id: userId,
    artist_id: input.artistId,
    title: input.title,
    release_year: input.releaseYear,
    album_type: input.albumType,
    notes: input.notes,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateAlbum(albumId: string, input: UpdateAlbumInput): Promise<void> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      if (!hasDemoSession()) {
        throw new Error('Sign in before editing albums.');
      }
      writeDemoAlbums(
        readDemoAlbums().map((album) =>
          album.id === albumId
            ? {
                ...album,
                title: input.title,
                releaseYear: input.releaseYear,
                albumType: input.albumType,
                notes: input.notes,
              }
            : album,
        ),
      );
      return;
    }
    throw caughtError;
  }

  const { error } = await supabase
    .from('albums')
    .update({
      artist_id: input.artistId,
      title: input.title,
      release_year: input.releaseYear,
      album_type: input.albumType,
      notes: input.notes,
    })
    .eq('id', albumId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteAlbum(albumId: string): Promise<void> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      if (!hasDemoSession()) {
        throw new Error('Sign in before deleting albums.');
      }
      writeDemoAlbums(readDemoAlbums().filter((album) => album.id !== albumId));
      return;
    }
    throw caughtError;
  }

  const { error } = await supabase.from('albums').delete().eq('id', albumId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getAlbumById(albumId: string): Promise<AlbumDetail | null> {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (caughtError) {
    if (isMissingSupabaseEnvError(caughtError)) {
      return findDemoAlbum(albumId);
    }
    throw caughtError;
  }

  const { data, error } = await supabase
    .from('albums')
    .select('id,title,release_year,album_type,notes,artists(name)')
    .eq('id', albumId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapAlbumRow(data as AlbumRow) : null;
}
