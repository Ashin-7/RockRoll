import { ReactNode } from 'react';
import './Panel.css';

interface PanelProps {
  children: ReactNode;
  className?: string;
  variant?: 'panel' | 'card' | 'hero';
  as?: 'div' | 'section' | 'article' | 'aside';
  'aria-label'?: string;
}

export function Panel({
  children,
  className = '',
  variant = 'panel',
  as: Component = 'div',
  ...props
}: PanelProps) {
  const classes = ['ui-panel', `ui-panel--${variant}`, className].filter(Boolean).join(' ');

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
}
