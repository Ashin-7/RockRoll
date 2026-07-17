import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { PracticeSessionForm } from './PracticeSessionForm';

describe('PracticeSessionForm', () => {
  it('submits a practice session draft', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithI18n(<PracticeSessionForm onSave={onSave} />);

    await user.type(screen.getByLabelText('Duration minutes'), '45');
    await user.type(screen.getByLabelText('Goal duration minutes'), '60');
    await user.type(screen.getByLabelText('Completion percent'), '75');
    await user.type(screen.getByLabelText('BPM'), '92');
    await user.type(screen.getByLabelText('Practice tags'), 'rhythm, bends');
    await user.type(screen.getByLabelText('Focus area'), 'Verse rhythm and bends');
    await user.type(screen.getByLabelText('Reflection'), 'Timing is tighter than yesterday.');
    await user.click(screen.getByRole('button', { name: 'Save practice session' }));

    expect(onSave).toHaveBeenCalledWith({
      songId: null,
      durationMinutes: 45,
      goalDurationMinutes: 60,
      completionPercent: 75,
      bpm: 92,
      tags: ['rhythm', 'bends'],
      focusArea: 'Verse rhythm and bends',
      reflection: 'Timing is tighter than yesterday.',
    });
  });

  it('submits the selected song with a practice session draft', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithI18n(
      <PracticeSessionForm
        onSave={onSave}
        songs={[
          {
            id: 'little-wing',
            title: 'Little Wing',
            artistName: 'Jimi Hendrix',
            status: 'learning',
            difficulty: 4,
          },
        ]}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Song'), 'little-wing');
    await user.type(screen.getByLabelText('Duration minutes'), '30');
    await user.click(screen.getByRole('button', { name: 'Save practice session' }));

    expect(onSave).toHaveBeenCalledWith({
      songId: 'little-wing',
      durationMinutes: 30,
      goalDurationMinutes: null,
      completionPercent: null,
      bpm: null,
      tags: [],
      focusArea: '',
      reflection: '',
    });
  });

  it('adjusts numeric fields with stepper controls', async () => {
    const user = userEvent.setup();

    renderWithI18n(<PracticeSessionForm onSave={vi.fn()} />);

    await user.type(screen.getByLabelText('Duration minutes'), '28');
    await user.click(screen.getByRole('button', { name: 'Increase duration' }));
    expect(screen.getByLabelText('Duration minutes')).toHaveValue(29);

    await user.click(screen.getByRole('button', { name: 'Decrease duration' }));
    expect(screen.getByLabelText('Duration minutes')).toHaveValue(28);

    await user.click(screen.getByRole('button', { name: 'Increase goal duration' }));
    expect(screen.getByLabelText('Goal duration minutes')).toHaveValue(1);

    await user.click(screen.getByRole('button', { name: 'Increase completion percent' }));
    expect(screen.getByLabelText('Completion percent')).toHaveValue(1);

    await user.click(screen.getByRole('button', { name: 'Increase BPM' }));
    expect(screen.getByLabelText('BPM')).toHaveValue(1);
  });
});
