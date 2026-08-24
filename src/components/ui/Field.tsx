import { Children, cloneElement, isValidElement, ReactElement, ReactNode, useId } from 'react';

interface FieldProps {
  children: ReactElement;
  className?: string;
  error?: ReactNode;
  hint?: ReactNode;
  label: ReactNode;
}

interface FieldControlProps {
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'false' | 'true';
  id?: string;
}

export function Field({ children, className = '', error, hint, label }: FieldProps) {
  const generatedId = useId();
  const child = Children.only(children);
  const childProps = isValidElement<FieldControlProps>(child) ? child.props : {};
  const existingId = childProps.id;
  const fieldId = existingId || generatedId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [childProps['aria-describedby'], hintId, errorId].filter(Boolean).join(' ') || undefined;
  const input = cloneElement(child, {
    id: fieldId,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : childProps['aria-invalid'],
  });
  const classes = ['ui-field', className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <label htmlFor={fieldId}>{label}</label>
      {input}
      {hint ? <small id={hintId}>{hint}</small> : null}
      {error ? (
        <small className="ui-field__error" id={errorId} role="alert">
          {error}
        </small>
      ) : null}
    </div>
  );
}
