import { ReactNode } from 'react';

interface ActionBarProps {
  children: ReactNode;
  className?: string;
}

export function ActionBar({ children, className = '' }: ActionBarProps) {
  const classes = ['ui-action-bar', className].filter(Boolean).join(' ');

  return <div className={classes}>{children}</div>;
}
