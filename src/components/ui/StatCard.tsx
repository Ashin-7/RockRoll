import { ReactNode } from 'react';
import './StatCard.css';

interface StatCardProps {
  className?: string;
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  align?: 'left' | 'right' | 'center';
}

export function StatCard({ className = '', label, value, detail, align = 'left' }: StatCardProps) {
  const classes = ['ui-stat-card', `ui-stat-card--${align}`, className].filter(Boolean).join(' ');

  return (
    <article className={classes}>
      <p className="ui-stat-card__label">{label}</p>
      <strong className="ui-stat-card__value">{value}</strong>
      {detail ? <span className="ui-stat-card__detail">{detail}</span> : null}
    </article>
  );
}
