'use client';
import type { ComponentProps } from 'react';
import { classes } from '../../lib/classes';
export function GatherTextarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={classes('textarea', className)} {...props} />;
}
