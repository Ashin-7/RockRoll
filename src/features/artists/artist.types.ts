export interface ArtistSummary {
  id: string;
  name: string;
  country: string | null;
  beginYear: number | null;
  endYear: number | null;
  notes: string;
}

export interface CreateArtistInput {
  name: string;
  country: string | null;
  beginYear: number | null;
  notes: string;
}
