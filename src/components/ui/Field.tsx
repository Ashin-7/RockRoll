import { Children, cloneElement, isValidElement, ReactElement, ReactNode, useId } from 'react';

interface FieldProps {
  children: ReactElement;
  className?: string;
  hint?: ReactNode;
  label: ReactNode;
}

export function Field({ children, className = '', hint, label }: FieldProps) {
  const generatedId = useId();
  const child = Children.only(children);
  const existingId = isValidElement<{ id?: string }>(child) ? child.props.id : undefined;
  const fieldId = existingId || generatedId;
  const input = cloneElement(child, { id: fieldId });
  const classes = ['ui-field', className].filter(Boolean).join(' ');

  return (
    <label className={classes} htmlFor={fieldId}>
      <span>{label}</span>
      {input}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}
