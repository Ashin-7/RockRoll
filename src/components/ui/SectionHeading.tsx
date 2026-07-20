import { ReactNode } from 'react';
import './SectionHeading.css';

interface SectionHeadingProps {
  className?: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  action?: ReactNode;
}

export function SectionHeading({ className = '', eyebrow, title, action }: SectionHeadingProps) {
  const classes = ['ui-section-heading', className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <div className="ui-section-heading__text">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
      </div>
      {action ? <div className="ui-section-heading__action">{action}</div> : null}
    </div>
  );
}
