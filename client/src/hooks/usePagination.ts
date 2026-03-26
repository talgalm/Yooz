import { useState, useMemo, useEffect } from 'react';

const DEFAULT_PAGE_SIZE = 10;

export function usePagination<T>(items: T[], pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [items.length, pageSize]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const safeSetPage = (p: number) => {
    setPage(Math.max(1, Math.min(p, totalPages)));
  };

  return {
    page,
    setPage: safeSetPage,
    totalPages,
    pageItems,
    totalItems: items.length,
    showing: {
      from: items.length === 0 ? 0 : (page - 1) * pageSize + 1,
      to: Math.min(page * pageSize, items.length),
    },
  };
}
