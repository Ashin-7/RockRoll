import { FormEvent, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { createPracticeSession } from './practice.service';
import { PracticeSessionInput } from './practice.types';

interface PracticeSessionFormProps {
  onSave?: (input: PracticeSessionInput) => Promise<void>;
}

export function PracticeSessionForm({ onSave = createPracticeSession }: PracticeSessionFormProps) {
  const { t } = useI18n();
  const [durationMinutes, setDurationMinutes] = useState('');
  const [bpm, setBpm] = useState('');
  const [focusArea, setFocusArea] = useState('');
  const [reflection, setReflection] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onSave({
      durationMinutes: Number(durationMinutes),
      bpm: bpm ? Number(bpm) : null,
      focusArea,
      reflection,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
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
