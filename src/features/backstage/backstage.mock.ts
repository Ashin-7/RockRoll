export interface PracticeFocus {
  songTitle: string;
  artistName: string;
  target: string;
  tempo: string;
  durationMinutes: number;
  takeLabel: string;
}

export interface ArchiveSignal {
  label: string;
  value: string;
  detail: string;
}

export interface RecentTape {
  title: string;
  recordedAt: string;
  note: string;
}

export interface ImportDraft {
  title: string;
  source: string;
  type: string;
}

export const practiceFocus: PracticeFocus = {
  songTitle: 'Little Wing',
  artistName: 'Jimi Hendrix',
  target: 'Verse chord color and slow bends',
  tempo: '72 → 92 BPM',
  durationMinutes: 45,
  takeLabel: 'Take 07',
};

export const archiveSignals: ArchiveSignal[] = [
  {
    label: 'Practice',
    value: '4h 20m',
    detail: 'This week in the room',
  },
  {
    label: 'Songs',
    value: '18',
    detail: 'Learning, polishing, archived',
  },
  {
    label: 'Archive',
    value: '42',
    detail: 'Artists, records, genres',
  },
];

export const recentTapes: RecentTape[] = [
  {
    title: 'Little Wing - clean intro',
    recordedAt: 'Today · 21:12',
    note: 'Tone is close; vibrato still nervous.',
  },
  {
    title: 'Autumn Leaves - walking bass sketch',
    recordedAt: 'Yesterday · 22:40',
    note: 'ii-V-I changes need slower comping.',
  },
];

export const importDrafts: ImportDraft[] = [
  {
    title: 'Kind of Blue',
    source: 'MusicBrainz',
    type: 'Album draft',
  },
  {
    title: 'B.B. King',
    source: 'Discogs',
    type: 'Artist draft',
  },
];
