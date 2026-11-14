import type { ComponentProps } from 'react';
const paths = {
  palette:
    'M12 3a9 9 0 1 0 0 18h1.4a2.6 2.6 0 0 0 1.8-4.4.9.9 0 0 1 .6-1.6H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8Z',
  chevron: 'm6 9 6 6 6-6',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M6 18 18 6',
  reset: 'M3 10a9 9 0 1 1 2 8M3 4v6h6',
} as const;
export function GatherIcon({
  name,
  ...props
}: ComponentProps<'svg'> & { name: keyof typeof paths }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={paths[name]} />
      {name === 'palette' && (
        <g fill="currentColor" stroke="none">
          <circle cx="7.5" cy="11" r="1.2" />
          <circle cx="10" cy="7" r="1.2" />
          <circle cx="15" cy="7.5" r="1.2" />
          <circle cx="17.5" cy="11" r="1.2" />
        </g>
      )}
    </svg>
  );
}
