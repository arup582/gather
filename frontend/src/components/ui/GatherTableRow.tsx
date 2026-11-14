'use client';
import type { ComponentProps } from 'react';
export function GatherTableRow({ className = '', ...props }: ComponentProps<'tr'>) {
  return <tr className={`row-hover ${className}`} {...props} />;
}
