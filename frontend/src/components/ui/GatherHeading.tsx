'use client';
import type { HTMLAttributes } from 'react';
export function GatherHeading({
  level = 2,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & { level?: 1 | 2 | 3 }) {
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3';
  return <Tag {...props} />;
}
