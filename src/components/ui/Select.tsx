import * as SelectPrimitive from '@radix-ui/react-select';
import { ReactNode, useLayoutEffect, useRef, useState } from 'react';
import './controls.css';

const emptyValue = '__rockroll_select_empty__';

function toPrimitiveValue(value?: string) {
  return value === '' ? emptyValue : value;
}

export interface SelectOption<TValue extends string = string> {
  label: ReactNode;
  value: TValue;
}

interface SelectProps<TValue extends string = string> {
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'false' | 'true';
  'aria-label'?: string;
  className?: string;
  defaultValue?: TValue;
  disabled?: boolean;
  id?: string;
  name?: string;
  onValueChange?: (value: TValue) => void;
  options: SelectOption<TValue>[];
  placeholder?: ReactNode;
  required?: boolean;
  value?: TValue;
}

export function Select<TValue extends string = string>({
  className = '',
  defaultValue,
  disabled,
  id,
  name,
  onValueChange,
  options,
  placeholder,
  required,
  value,
  ...ariaProps
}: SelectProps<TValue>) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const triggerClasses = ['ui-select', 'ui-select-trigger', className].filter(Boolean).join(' ');

  useLayoutEffect(() => {
    setPortalContainer(triggerRef.current?.closest<HTMLElement>('.app-shell') ?? document.body);
  }, []);

  return (
    <SelectPrimitive.Root
      defaultValue={toPrimitiveValue(defaultValue)}
      disabled={disabled}
      name={name}
      onValueChange={(nextValue) => onValueChange?.((nextValue === emptyValue ? '' : nextValue) as TValue)}
      required={required}
      value={toPrimitiveValue(value)}
    >
      <SelectPrimitive.Trigger className={triggerClasses} id={id} ref={triggerRef} {...ariaProps}>
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon className="ui-select-trigger__icon" aria-hidden="true">
          ▾
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal container={portalContainer}>
        <SelectPrimitive.Content className="ui-select-content" position="popper" sideOffset={4}>
          <SelectPrimitive.Viewport className="ui-select-viewport">
            {options.map((option) => (
              <SelectPrimitive.Item
                className="ui-select-item"
                key={option.value || emptyValue}
                value={toPrimitiveValue(option.value) || emptyValue}
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="ui-select-item__indicator" aria-hidden="true">
                  ✓
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
