import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PracticeSessionForm } from './PracticeSessionForm';

describe('PracticeSessionForm', () => {
  it('submits a practice session draft', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<PracticeSessionForm onSave={onSave} />);

    await user.type(screen.getByLabelText('Duration minutes'), '45');
    await user.type(screen.getByLabelText('BPM'), '92');
    await user.type(screen.getByLabelText('Focus area'), 'Verse rhythm and bends');
    await user.type(screen.getByLabelText('Reflection'), 'Timing is tighter than yesterday.');
    await user.click(screen.getByRole('button', { name: 'Save practice session' }));

    expect(onSave).toHaveBeenCalledWith({
      durationMinutes: 45,
      bpm: 92,
      focusArea: 'Verse rhythm and bends',
      reflection: 'Timing is tighter than yesterday.',
    });
  });
});
