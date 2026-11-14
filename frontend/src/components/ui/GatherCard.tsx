'use client';
import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { classes } from '../../lib/classes';
export function GatherCard({
  as: Tag = 'section',
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { as?: ElementType; children?: ReactNode }) {
  return <Tag className={classes('card card-border panel', className)} {...props} />;
}
