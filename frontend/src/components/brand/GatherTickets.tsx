export function GatherTickets() {
  return (
    <svg
      className="gather-tickets"
      width="160"
      height="100"
      viewBox="0 0 160 100"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g transform="rotate(-14 70 48)">
        <path
          d="M19 16h102v17a10 10 0 0 0 0 20v17H19V53a10 10 0 0 0 0-20Z"
          fill="var(--color-secondary)"
        />
        <path d="M94 21v44" stroke="var(--color-secondary-content)" strokeDasharray="4 4" />
      </g>
      <g transform="rotate(10 88 62)">
        <path
          d="M35 36h106v17a10 10 0 0 0 0 20v17H35V73a10 10 0 0 0 0-20Z"
          fill="var(--color-primary)"
        />
        <g stroke="var(--color-primary-content)" strokeWidth="2" strokeLinecap="round">
          <path d="M113 41v44" strokeDasharray="4 4" />
          <path d="M55 57h37m-37 9h23" />
        </g>
        <path
          d="m126 58 1.5 3.5 4 .5-3 2.5.8 4-3.3-2-3.3 2 .8-4-3-2.5 4-.5Z"
          fill="var(--color-primary-content)"
        />
      </g>
      <path d="m140 11 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="var(--color-accent)" />
      <circle cx="16" cy="80" r="4" fill="var(--color-secondary)" />
    </svg>
  );
}
