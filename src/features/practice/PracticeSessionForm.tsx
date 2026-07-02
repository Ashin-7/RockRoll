import { FormEvent, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { SongSummary } from '../songs/song.types';
import { createPracticeSession } from './practice.service';
import { PracticeSessionInput } from './practice.types';

interface PracticeSessionFormProps {
  initialValues?: PracticeSessionInput;
  onSave?: (input: PracticeSessionInput) => Promise<void>;
  songs?: SongSummary[];
}

export function PracticeSessionForm({ initialValues, onSave = createPracticeSession, songs = [] }: PracticeSessionFormProps) {
  const { t } = useI18n();
  const [songId, setSongId] = useState(initialValues?.songId ?? '');
  const [durationMinutes, setDurationMinutes] = useState(
    initialValues ? String(initialValues.durationMinutes) : '',
  );
  const [bpm, setBpm] = useState(initialValues?.bpm ? String(initialValues.bpm) : '');
  const [focusArea, setFocusArea] = useState(initialValues?.focusArea ?? '');
  const [reflection, setReflection] = useState(initialValues?.reflection ?? '');

  useEffect(() => {
    setSongId(initialValues?.songId ?? '');
    setDurationMinutes(initialValues ? String(initialValues.durationMinutes) : '');
    setBpm(initialValues?.bpm ? String(initialValues.bpm) : '');
    setFocusArea(initialValues?.focusArea ?? '');
    setReflection(initialValues?.reflection ?? '');
  }, [initialValues]);

  function adjustNumberValue(value: string, setValue: (nextValue: string) => void, delta: number) {
    const numericValue = value ? Number(value) : 0;
    const nextValue = Math.max(1, numericValue + delta);
    setValue(String(nextValue));
  }

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
    <form className="practice-session-form" onSubmit={handleSubmit}>
      <section className="practice-session-form__section">
        <h3>{t('practiceHistory.formSongSection')}</h3>
        {songs.length > 0 ? (
          <div className="practice-session-form__field">
            <label htmlFor="songId">{t('practice.song')}</label>
            <select id="songId" value={songId} onChange={(event) => setSongId(event.target.value)}>
              <option value="">{t('practice.noSong')}</option>
              {songs.map((song) => (
                <option key={song.id} value={song.id}>
                  {song.title}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="practice-session-form__hint">{t('practice.noSong')}</p>
        )}
      </section>

      <section className="practice-session-form__section practice-session-form__section--grid">
        <h3>{t('practiceHistory.formTempoSection')}</h3>
        <div className="practice-session-form__field">
          <label htmlFor="durationMinutes">{t('practice.duration')}</label>
          <div className="practice-number-field">
            <input
              id="durationMinutes"
              type="number"
              min="1"
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(event.target.value)}
              required
            />
            <div className="practice-number-field__controls">
              <button
                type="button"
                aria-label={t('practice.decreaseDuration')}
                onClick={() => adjustNumberValue(durationMinutes, setDurationMinutes, -1)}
              >
                -
              </button>
              <button
                type="button"
                aria-label={t('practice.increaseDuration')}
                onClick={() => adjustNumberValue(durationMinutes, setDurationMinutes, 1)}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="practice-session-form__field">
          <label htmlFor="bpm">{t('practice.bpm')}</label>
          <div className="practice-number-field">
            <input id="bpm" type="number" min="1" value={bpm} onChange={(event) => setBpm(event.target.value)} />
            <div className="practice-number-field__controls">
              <button
                type="button"
                aria-label={t('practice.decreaseBpm')}
                onClick={() => adjustNumberValue(bpm, setBpm, -1)}
              >
                -
              </button>
              <button type="button" aria-label={t('practice.increaseBpm')} onClick={() => adjustNumberValue(bpm, setBpm, 1)}>
                +
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="practice-session-form__section">
        <h3>{t('practiceHistory.formNotesSection')}</h3>
        <div className="practice-session-form__field">
          <label htmlFor="focusArea">{t('practice.focusArea')}</label>
          <input id="focusArea" value={focusArea} onChange={(event) => setFocusArea(event.target.value)} />
        </div>

        <div className="practice-session-form__field">
          <label htmlFor="reflection">{t('practice.reflection')}</label>
          <textarea id="reflection" value={reflection} onChange={(event) => setReflection(event.target.value)} />
        </div>
      </section>

      <div className="practice-session-form__actions">
        <span>{t('practiceHistory.formSaveHint')}</span>
        <button type="submit">{t('practice.save')}</button>
      </div>
    </form>
  );
}
