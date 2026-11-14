import { GatherMark } from './GatherMark';

export function GatherScene() {
  return (
    <svg
      className="gather-scene"
      width="520"
      height="400"
      viewBox="0 0 520 400"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* A little outdoor stage, lights, and people coming together. */}
      <path d="M58 352V208a182 182 0 0 1 364 0v144Z" fill="var(--color-base-200)" />
      <path d="M134 352V196a112 112 0 0 1 224 0v156Z" fill="var(--color-primary)" />
      <path d="M162 352V199a84 84 0 0 1 168 0v153Z" fill="var(--color-base-100)" />
      <circle cx="414" cy="88" r="43" fill="var(--color-accent)" />
      <GatherMark x="390" y="64" width="48" height="48" />

      <path
        d="M55 70q180 130 395 70"
        stroke="var(--color-base-content)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <g fill="var(--color-secondary)">
        <path d="m87 90 24 14-23 20Zm60 30 26 8-18 21Zm70 17 26 3-13 24Zm73 3 26-1-9 25Zm74-6 25-5-4 26Z" />
      </g>

      {/* Calendar and music are visual cues, not invented event details. */}
      <g transform="rotate(-9 88 230)">
        <rect
          x="38"
          y="178"
          width="100"
          height="100"
          rx="12"
          fill="var(--color-base-100)"
          stroke="var(--color-base-300)"
          strokeWidth="2"
        />
        <path d="M38 206h100" stroke="var(--color-base-300)" strokeWidth="2" />
        <path
          d="M63 170v17m50-17v17"
          stroke="var(--color-base-content)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <g fill="var(--color-primary)">
          <circle cx="63" cy="227" r="5" />
          <circle cx="88" cy="227" r="5" />
          <circle cx="113" cy="227" r="5" />
          <circle cx="63" cy="252" r="5" />
          <circle cx="88" cy="252" r="5" />
        </g>
        <path
          d="m105 251 6 6 11-14"
          stroke="var(--color-secondary)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <g
        stroke="var(--color-base-content)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M424 219v-31l24-6v31m-24-15 24-6" />
        <ellipse cx="418" cy="221" rx="6" ry="4" fill="var(--color-base-content)" />
        <ellipse cx="442" cy="215" rx="6" ry="4" fill="var(--color-base-content)" />
      </g>

      {/* Three guests, with gestures that meet around the stage. */}
      <g stroke="var(--color-base-content)" strokeWidth="12" strokeLinecap="round">
        <path d="m175 319-11 51m35-51 12 51M263 309l-6 61m29-61 15 61m51-44-9 44m30-44 11 44" />
      </g>
      <path d="M151 321v-50a35 35 0 0 1 70 0v50Z" fill="var(--color-secondary)" />
      <path d="M243 311v-63a31 31 0 0 1 62 0v63Z" fill="var(--color-accent)" />
      <path d="M330 328v-48a31 31 0 0 1 62 0v48Z" fill="var(--color-primary)" />
      <g strokeWidth="15" strokeLinecap="round" strokeLinejoin="round">
        <path d="m158 265-20 21-9-28m85 1 21 15 21-23" stroke="var(--color-secondary)" />
        <path d="m250 243-25-15-11-30m83 49 19 23 19-9" stroke="var(--color-accent)" />
        <path d="m337 280-17 17-13-9m77-15 21-21 5-20" stroke="var(--color-primary)" />
      </g>
      <g fill="var(--color-base-content)">
        <circle cx="185" cy="212" r="22" />
        <circle cx="274" cy="193" r="21" />
        <circle cx="361" cy="229" r="21" />
      </g>
      <path
        d="M165 204q20-28 40 0m51-17q18-24 36 0"
        stroke="var(--color-base-100)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M50 378h420" stroke="var(--color-base-300)" strokeWidth="2" strokeLinecap="round" />
      <path
        d="m46 136 3 9 9 3-9 3-3 9-3-9-9-3 9-3Zm413 163 3 9 9 3-9 3-3 9-3-9-9-3 9-3Z"
        fill="var(--color-secondary)"
      />
      <path
        d="m104 326-6 10m334-72 9 5m-58-231 4 10"
        stroke="var(--color-accent)"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}
