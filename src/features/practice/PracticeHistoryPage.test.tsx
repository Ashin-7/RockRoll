import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithI18n } from '../../test/render';
import { PracticeHistoryPage } from './PracticeHistoryPage';

describe('PracticeHistoryPage', () => {
  it('renders local practice history records and statistics by default', () => {
    renderWithI18n(<PracticeHistoryPage />);

    expect(screen.getByText('Practice History')).toBeInTheDocument();
    expect(screen.getByText('Practice Statistics')).toBeInTheDocument();
    expect(screen.getByText('Total sessions')).toBeInTheDocument();
    expect(screen.getByText('Total minutes')).toBeInTheDocument();
    expect(screen.getByText('100 min')).toBeInTheDocument();
    expect(screen.getByText('Songs practiced')).toBeInTheDocument();
    expect(screen.getByText('Average session')).toBeInTheDocument();
    expect(screen.getByText('33 min')).toBeInTheDocument();
    expect(screen.getByText('Latest practice')).toBeInTheDocument();
    expect(screen.getByText('Little Wing')).toBeInTheDocument();
    expect(screen.getByText('Jimi Hendrix')).toBeInTheDocument();
    expect(screen.getAllByText('2026-07-01')).toHaveLength(2);
    expect(screen.getByText('45 min')).toBeInTheDocument();
    expect(screen.getByText('92 BPM')).toBeInTheDocument();
    expect(screen.getByText('Verse rhythm and bends')).toBeInTheDocument();
  });

  it('renders empty state when no practice records exist', () => {
    renderWithI18n(<PracticeHistoryPage sessions={[]} />);

    expect(screen.getByText('Practice Statistics')).toBeInTheDocument();
    expect(screen.getAllByText('0')).toHaveLength(2);
    expect(screen.getAllByText('0 min')).toHaveLength(2);
    expect(screen.getByText('No practice yet')).toBeInTheDocument();
    expect(screen.getByText('No practice sessions recorded yet.')).toBeInTheDocument();
  });

  it('renders Chinese messages', () => {
    window.localStorage.setItem('rcokroll.locale', 'zh-CN');

    renderWithI18n(<PracticeHistoryPage sessions={[]} />);

    expect(screen.getByText('练习历史')).toBeInTheDocument();
    expect(screen.getByText('练习统计')).toBeInTheDocument();
    expect(screen.getByText('还没有练习记录。')).toBeInTheDocument();
  });
});
