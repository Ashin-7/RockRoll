import { ReactNode } from 'react';

interface FormSectionProps {
  children: ReactNode;
  className?: string;
  title: ReactNode;
}

export function FormSection({ children, className = '', title }: FormSectionProps) {
  const classes = ['ui-form-section', className].filter(Boolean).join(' ');

  return (
    <fieldset className={classes}>
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
}
