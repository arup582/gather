'use client';

export function GatherBadge({ status }: { status: string }) {
  const tone =
    status === 'PUBLISHED' || status === 'ACTIVE'
      ? 'success'
      : status === 'CANCELLED'
        ? 'error'
        : 'warning';
  return (
    <span className={`badge badge-soft badge-${tone}`}>
      {status.replaceAll('_', ' ').toLowerCase()}
    </span>
  );
}
