import { SongSummary } from './song.types';

export interface SongBoardItem extends SongSummary {
  style: string;
  tempo: string;
  lastPracticed: string;
  focus: string;
  nextStep: string;
}

export const localSongBoard: SongBoardItem[] = [
  {
    id: 'little-wing',
    title: 'Little Wing',
    artistName: 'Jimi Hendrix',
    status: 'learning',
    difficulty: 4,
    style: 'Rock / Blues',
    tempo: '72-92 BPM',
    lastPracticed: 'Today',
    focus: 'Solo checkpoint',
    nextStep: 'Keep bends slow and make the vibrato sing.',
  },
  {
    id: 'autumn-leaves',
    title: 'Autumn Leaves',
    artistName: 'Joseph Kosma',
    status: 'polishing',
    difficulty: 3,
    style: 'Jazz Standard',
    tempo: '80 BPM',
    lastPracticed: 'Yesterday',
    focus: 'Walking bass sketch',
    nextStep: 'Comp shell voicings through ii-V-I changes.',
  },
  {
    id: 'the-thrill-is-gone',
    title: 'The Thrill Is Gone',
    artistName: 'B.B. King',
    status: 'planned',
    difficulty: 2,
    style: 'Blues',
    tempo: '68 BPM',
    lastPracticed: 'Queued',
    focus: 'Call-and-response phrasing',
    nextStep: 'Map the vocal spaces before adding lead lines.',
  },
];
