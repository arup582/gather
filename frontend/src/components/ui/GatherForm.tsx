'use client';
import type { ComponentProps } from 'react';
import { classes } from '../../lib/classes';
export function GatherForm({
  panel = false,
  className,
  ...props
}: ComponentProps<'form'> & { panel?: boolean }) {
  return (
    <form className={classes(panel ? 'card card-border panel' : undefined, className)} {...props} />
  );
}
