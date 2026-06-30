import { FormEvent, useState } from 'react';
import { createPracticeSession } from './practice.service';
import { PracticeSessionInput } from './practice.types';

interface PracticeSessionFormProps {
  onSave?: (input: PracticeSessionInput) => Promise<void>;
}

export function PracticeSessionForm({ onSave = createPracticeSession }: PracticeSessionFormProps) {
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
      <label htmlFor="durationMinutes">Duration minutes</label>
      <input
        id="durationMinutes"
        type="number"
        min="1"
        value={durationMinutes}
        onChange={(event) => setDurationMinutes(event.target.value)}
        required
      />

      <label htmlFor="bpm">BPM</label>
      <input id="bpm" type="number" min="1" value={bpm} onChange={(event) => setBpm(event.target.value)} />

      <label htmlFor="focusArea">Focus area</label>
      <input id="focusArea" value={focusArea} onChange={(event) => setFocusArea(event.target.value)} />

      <label htmlFor="reflection">Reflection</label>
      <textarea id="reflection" value={reflection} onChange={(event) => setReflection(event.target.value)} />

      <button type="submit">Save practice session</button>
    </form>
  );
}
