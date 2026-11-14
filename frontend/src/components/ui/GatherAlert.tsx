'use client';
import type { HTMLAttributes, ReactNode } from 'react';
export function GatherAlert({
  children,
  tone = 'info',
  className = '',
  role,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode; tone?: 'info' | 'success' | 'error' }) {
  return (
    <div
      {...props}
      role={role ?? (tone === 'error' ? 'alert' : tone === 'success' ? 'status' : undefined)}
      className={['alert alert-soft banner', `alert-${tone}`, className].join(' ')}
    >
      {children}
    </div>
  );
}
