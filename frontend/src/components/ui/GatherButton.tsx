'use client';
import type { ComponentProps } from 'react';
import { classes } from '../../lib/classes';
const variants = {
  primary: 'btn-primary',
  secondary: 'btn-outline',
  danger: 'btn-error btn-outline',
};
export function GatherButton({
  variant = 'primary',
  className,
  ...props
}: ComponentProps<'button'> & { variant?: keyof typeof variants }) {
  return <button className={classes('btn', variants[variant], className)} {...props} />;
}
