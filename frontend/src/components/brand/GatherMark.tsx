import type { ComponentProps } from 'react';

export function GatherMark(props: ComponentProps<'svg'>) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g stroke="var(--color-primary)" strokeWidth="6" strokeLinecap="round">
        <path d="M20 5v7m0 16v7M5 20h7m16 0h7M9.4 9.4l5 5m11.2 11.2 5 5M9.4 30.6l5-5m11.2-11.2 5-5" />
      </g>
      <circle cx="20" cy="20" r="4" fill="var(--color-secondary)" />
    </svg>
  );
}
