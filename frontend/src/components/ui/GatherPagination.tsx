'use client';
import { useEffect, useState } from 'react';
import type { Page } from '../../types';
import { GatherButton } from './GatherButton';
import { GatherForm } from './GatherForm';
import { GatherInput } from './GatherInput';
import { GatherSelect } from './GatherSelect';
export interface PaginationProps {
  data: Page<unknown>;
  pageSize: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
  sizes?: readonly number[];
  sizeLabel?: string;
}
export function GatherPagination({
  data,
  pageSize,
  onPage,
  onPageSize,
  sizes = [10, 20, 50, 100],
  sizeLabel = 'Rows per page',
}: PaginationProps) {
  const pages = Math.max(1, data.totalPages);
  const [target, setTarget] = useState(String(data.page + 1));
  useEffect(() => setTarget(String(data.page + 1)), [data.page]);
  const first = data.totalElements === 0 ? 0 : data.page * pageSize + 1;
  const last = Math.min(data.page * pageSize + data.content.length, data.totalElements);
  return (
    <nav className="gather-pagination" aria-label="Pagination">
      <p className="pagination-count" aria-live="polite">
        {first}–{last} of {data.totalElements}
      </p>
      <div className="pagination-size">
        <span>{sizeLabel}</span>
        <GatherSelect
          aria-label={sizeLabel}
          value={String(pageSize)}
          onValueChange={(value) => onPageSize(Number(value))}
          options={sizes.map((size) => ({ value: String(size), label: String(size) }))}
        />
      </div>
      <div className="pagination-navigation">
        <GatherButton
          type="button"
          variant="secondary"
          aria-label="First page"
          disabled={data.page === 0}
          onClick={() => onPage(0)}
        >
          «
        </GatherButton>
        <GatherButton
          type="button"
          variant="secondary"
          aria-label="Previous page"
          disabled={data.page === 0}
          onClick={() => onPage(data.page - 1)}
        >
          ‹
        </GatherButton>
        <span>
          Page {data.page + 1} of {pages}
        </span>
        <GatherButton
          type="button"
          variant="secondary"
          aria-label="Next page"
          disabled={data.page + 1 >= pages}
          onClick={() => onPage(data.page + 1)}
        >
          ›
        </GatherButton>
        <GatherButton
          type="button"
          variant="secondary"
          aria-label="Last page"
          disabled={data.page + 1 >= pages}
          onClick={() => onPage(pages - 1)}
        >
          »
        </GatherButton>
      </div>
      <GatherForm
        className="pagination-jump"
        onSubmit={(event) => {
          event.preventDefault();
          const value = Number(target);
          if (Number.isInteger(value) && value >= 1 && value <= pages) onPage(value - 1);
        }}
      >
        <GatherInput
          type="number"
          aria-label="Go to page"
          min={1}
          max={pages}
          required
          value={target}
          onChange={(event) => setTarget(event.target.value)}
        />
        <GatherButton variant="secondary" type="submit">
          Go
        </GatherButton>
      </GatherForm>
    </nav>
  );
}
