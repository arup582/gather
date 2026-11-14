'use client';
import { useState } from 'react';
export function usePagination(initialSize = 10) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialSize);
  function changePageSize(size: number) {
    setPageSize(size);
    setPage(0);
  }
  return { page, setPage, pageSize, changePageSize };
}
