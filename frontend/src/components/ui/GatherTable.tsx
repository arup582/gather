'use client';
import type { ComponentProps } from 'react';
export function GatherTable({
  caption,
  children,
  className,
  ...props
}: ComponentProps<'table'> & { caption: string }) {
  return (
    <div className="card card-border table-wrap" role="region" aria-label={caption} tabIndex={0}>
      <table className={['table', className].filter(Boolean).join(' ')} {...props}>
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}
