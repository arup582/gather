'use client';
import Link from 'next/link';
import type { ComponentProps } from 'react';
import { classes } from '../../lib/classes';
export function GatherLink({
  className,
  variant = 'text',
  ...props
}: ComponentProps<typeof Link> & { variant?: 'text' | 'primary' | 'secondary' | 'ghost' }) {
  return (
    <Link
      className={classes(
        variant === 'text'
          ? 'link link-hover'
          : `btn ${variant === 'primary' ? 'btn-primary' : variant === 'ghost' ? 'btn-ghost' : 'btn-outline'}`,
        className,
      )}
      {...props}
    />
  );
}
