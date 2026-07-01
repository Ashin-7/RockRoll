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
    await user.type(screen.getByLabelText('BPM'), '92');
    await user.type(screen.getByLabelText('Focus area'), 'Verse rhythm and bends');
    await user.type(screen.getByLabelText('Reflection'), 'Timing is tighter than yesterday.');
    await user.click(screen.getByRole('button', { name: 'Save practice session' }));

    expect(onSave).toHaveBeenCalledWith({
      songId: null,
      durationMinutes: 45,
      bpm: 92,
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
      bpm: null,
      focusArea: '',
      reflection: '',
    });
  });
});
