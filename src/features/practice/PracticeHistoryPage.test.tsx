import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { PracticeHistoryPage } from './PracticeHistoryPage';

describe('PracticeHistoryPage', () => {
  it('renders local practice history records by default', () => {
    renderWithI18n(<PracticeHistoryPage />);

    expect(screen.getByText('Practice History')).toBeInTheDocument();
    expect(screen.getByText('Little Wing')).toBeInTheDocument();
    expect(screen.getByText('Jimi Hendrix')).toBeInTheDocument();
    expect(screen.getByText('2026-07-01')).toBeInTheDocument();
    expect(screen.getByText('45 min')).toBeInTheDocument();
    expect(screen.getByText('92 BPM')).toBeInTheDocument();
    expect(screen.getByText('Verse rhythm and bends')).toBeInTheDocument();
  });

  it('renders empty state when no practice records exist', () => {
    renderWithI18n(<PracticeHistoryPage sessions={[]} />);

    expect(screen.getByText('No practice sessions recorded yet.')).toBeInTheDocument();
  });

  it('renders Chinese messages', () => {
    window.localStorage.setItem('rcokroll.locale', 'zh-CN');

    renderWithI18n(<PracticeHistoryPage sessions={[]} />);

    expect(screen.getByText('练习历史')).toBeInTheDocument();
    expect(screen.getByText('还没有练习记录。')).toBeInTheDocument();
  });
});
