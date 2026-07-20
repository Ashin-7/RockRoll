import { ReactNode } from 'react';
import './SectionHeading.css';

interface SectionHeadingProps {
  className?: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  action?: ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export function SectionHeading({ className = '', eyebrow, title, action, as: Heading = 'h2' }: SectionHeadingProps) {
  const classes = ['ui-section-heading', className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <div className="ui-section-heading__text">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <Heading>{title}</Heading>
      </div>
      {action ? <div className="ui-section-heading__action">{action}</div> : null}
    </div>
  );
}
