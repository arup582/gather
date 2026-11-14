'use client';
import type { ComponentProps } from 'react';
import { classes } from '../../lib/classes';
export function GatherInput({
  className,
  type = 'text',
  variant = 'default',
  ...props
}: ComponentProps<'input'> & { variant?: 'default' | 'button' }) {
  const component =
    type === 'range'
      ? 'range range-primary'
      : type === 'checkbox'
        ? 'checkbox checkbox-primary'
        : type === 'radio'
          ? variant === 'button'
            ? ''
            : 'radio radio-primary radio-sm'
          : 'input';
  return (
    <input
      type={type}
      className={classes(component, props['aria-invalid'] ? 'input-error' : undefined, className)}
      {...props}
    />
  );
}
