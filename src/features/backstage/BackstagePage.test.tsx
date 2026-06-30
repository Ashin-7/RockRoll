import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BackstagePage } from './BackstagePage';

describe('BackstagePage', () => {
  it('renders the local practice dashboard', () => {
    render(<BackstagePage />);

    expect(screen.getByText('Your private music archive.')).toBeInTheDocument();
    expect(screen.getByLabelText('Today practice amp panel')).toBeInTheDocument();
    expect(screen.getByText('Little Wing')).toBeInTheDocument();
    expect(screen.getByText('Practice evidence')).toBeInTheDocument();
    expect(screen.getByText('Kind of Blue')).toBeInTheDocument();
  });
});
