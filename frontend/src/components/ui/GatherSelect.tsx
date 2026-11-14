'use client';
import type { ComponentProps } from 'react';
import { classes } from '../../lib/classes';

export interface GatherSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
export type GatherSelectProps = Omit<
  ComponentProps<'select'>,
  'children' | 'value' | 'defaultValue' | 'onChange'
> & {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly GatherSelectOption[];
  placeholder?: string;
  name?: string;
  required?: boolean;
};
export function GatherSelect({
  value,
  onValueChange,
  options,
  placeholder,
  name,
  required,
  disabled,
  form,
  className,
  ...props
}: GatherSelectProps) {
  return (
    <select
      {...props}
      className={classes('select gather-select', className)}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      name={name}
      required={required}
      disabled={disabled}
      form={form}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
