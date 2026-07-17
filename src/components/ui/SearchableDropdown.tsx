import { ReactNode } from 'react';
import { Button } from './Button';
import { Field } from './Field';

export interface SearchableDropdownOption<TValue extends string = string> {
  id: string;
  label: string;
  meta?: ReactNode;
  status?: ReactNode;
  value: TValue;
}

interface SearchableDropdownProps<TValue extends string = string> {
  className?: string;
  emptyMessage?: ReactNode;
  label: string;
  onSearchChange: (value: string) => void;
  onSelect: (value: TValue) => void;
  options: SearchableDropdownOption<TValue>[];
  searchLabel: string;
  searchValue: string;
  selectLabel: string;
}

export function SearchableDropdown<TValue extends string = string>({
  className = '',
  emptyMessage,
  label,
  onSearchChange,
  onSelect,
  options,
  searchLabel,
  searchValue,
  selectLabel,
}: SearchableDropdownProps<TValue>) {
  const classes = ['ui-searchable-dropdown', className].filter(Boolean).join(' ');
  const normalizedSearch = searchValue.trim().toLocaleLowerCase();
  const filteredOptions = normalizedSearch
    ? options.filter((option) => option.label.toLocaleLowerCase().includes(normalizedSearch))
    : options;

  return (
    <div className={classes}>
      <Field label={searchLabel}>
        <input
          type="search"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </Field>
      {filteredOptions.length > 0 ? (
        <div className="ui-searchable-dropdown__list" role="listbox" aria-label={label}>
          {filteredOptions.map((option) => (
            <article className="ui-searchable-dropdown__option" key={option.id} role="option" aria-selected="false">
              <div>
                <h3>{option.label}</h3>
                {option.meta ? <p>{option.meta}</p> : null}
                {option.status ? <p>{option.status}</p> : null}
              </div>
              <Button
                type="button"
                aria-label={`${selectLabel} ${option.label}`}
                onClick={() => onSelect(option.value)}
              >
                {selectLabel}
              </Button>
            </article>
          ))}
        </div>
      ) : emptyMessage ? (
        <p>{emptyMessage}</p>
      ) : null}
    </div>
  );
}
