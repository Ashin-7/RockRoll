import { FormEvent, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { SongSummary } from '../songs/song.types';
import { createPracticeSession } from './practice.service';
import { PracticeSessionInput } from './practice.types';

interface PracticeSessionFormProps {
  onSave?: (input: PracticeSessionInput) => Promise<void>;
  songs?: SongSummary[];
}

export function PracticeSessionForm({ onSave = createPracticeSession, songs = [] }: PracticeSessionFormProps) {
  const { t } = useI18n();
  const [songId, setSongId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [bpm, setBpm] = useState('');
  const [focusArea, setFocusArea] = useState('');
  const [reflection, setReflection] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onSave({
      songId: songId || null,
      durationMinutes: Number(durationMinutes),
      bpm: bpm ? Number(bpm) : null,
      focusArea,
      reflection,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      {songs.length > 0 ? (
        <>
          <label htmlFor="songId">{t('practice.song')}</label>
          <select id="songId" value={songId} onChange={(event) => setSongId(event.target.value)}>
            <option value="">{t('practice.noSong')}</option>
            {songs.map((song) => (
              <option key={song.id} value={song.id}>
                {song.title}
              </option>
            ))}
          </select>
        </>
      ) : null}

      <label htmlFor="durationMinutes">{t('practice.duration')}</label>
      <input
        id="durationMinutes"
        type="number"
        min="1"
        value={durationMinutes}
        onChange={(event) => setDurationMinutes(event.target.value)}
        required
      />

      <label htmlFor="bpm">{t('practice.bpm')}</label>
      <input id="bpm" type="number" min="1" value={bpm} onChange={(event) => setBpm(event.target.value)} />

      <label htmlFor="focusArea">{t('practice.focusArea')}</label>
      <input id="focusArea" value={focusArea} onChange={(event) => setFocusArea(event.target.value)} />

      <label htmlFor="reflection">{t('practice.reflection')}</label>
      <textarea id="reflection" value={reflection} onChange={(event) => setReflection(event.target.value)} />

      <button type="submit">{t('practice.save')}</button>
    </form>
  );
}
