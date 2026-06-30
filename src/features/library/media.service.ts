import { supabase } from '../../lib/supabase';
import { MediaAssetSummary, MediaType } from './media.types';

interface MediaAssetRow {
  id: string;
  file_name: string;
  media_type: MediaType;
  created_at: string;
}

export async function listMediaAssets(): Promise<MediaAssetSummary[]> {
  const { data, error } = await supabase
    .from('media_assets')
    .select('id,file_name,media_type,created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as MediaAssetRow[]).map((asset) => ({
    id: asset.id,
    fileName: asset.file_name,
    mediaType: asset.media_type,
    createdAt: asset.created_at,
  }));
}
