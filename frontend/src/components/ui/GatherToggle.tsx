'use client';
import type { ComponentProps } from 'react';
import { classes } from '../../lib/classes';
export function GatherToggle({
  checked,
  onCheckedChange,
  label,
  className,
  ...props
}: Omit<ComponentProps<'input'>, 'type' | 'onChange' | 'children'> & {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className={classes('gather-toggle', className)}>
      <input
        {...props}
        type="checkbox"
        role="switch"
        className="toggle toggle-primary"
        checked={checked}
        aria-label={label}
        onChange={(event) => onCheckedChange(event.target.checked)}
      />
      <span aria-hidden="true">{checked ? 'Enabled' : 'Disabled'}</span>
    </label>
  );
}
