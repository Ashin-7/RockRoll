export interface PracticeHistoryItem {
  id: string;
  songId?: string | null;
  songTitle: string;
  artistName: string;
  practicedOn: string;
  durationMinutes: number;
  goalDurationMinutes?: number | null;
  completionPercent?: number | null;
  bpm: number | null;
  tags?: string[];
  focusArea: string;
  reflection: string;
}

export const localPracticeHistory: PracticeHistoryItem[] = [
  {
    id: 'practice-little-wing-2026-07-01',
    songTitle: 'Little Wing',
    artistName: 'Jimi Hendrix',
    practicedOn: '2026-07-01',
    durationMinutes: 45,
    goalDurationMinutes: 60,
    completionPercent: 75,
    bpm: 92,
    tags: ['rhythm', 'bends'],
    focusArea: 'Verse rhythm and bends',
    reflection: 'Keep the bends slower and let the vibrato settle before moving on.',
  },
  {
    id: 'practice-autumn-leaves-2026-06-30',
    songTitle: 'Autumn Leaves',
    artistName: 'Joseph Kosma',
    practicedOn: '2026-06-30',
    durationMinutes: 30,
    completionPercent: 100,
    bpm: 80,
    tags: ['voicings'],
    focusArea: 'Shell voicings through ii-V-I',
    reflection: 'Voice leading is cleaner when the bass movement is mapped first.',
  },
  {
    id: 'practice-thrill-2026-06-29',
    songTitle: 'The Thrill Is Gone',
    artistName: 'B.B. King',
    practicedOn: '2026-06-29',
    durationMinutes: 25,
    completionPercent: null,
    bpm: null,
    tags: [],
    focusArea: 'Call-and-response phrasing',
    reflection: 'Leave more space between vocal phrases before answering on guitar.',
  },
];
