'use client';

export function GatherLoading() {
  return (
    <div className="loading-state" role="status">
      <span className="loading loading-spinner" aria-hidden="true" /> Loading…
    </div>
  );
}
