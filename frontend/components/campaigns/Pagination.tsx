'use client';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNext: boolean;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  hasNext,
  onPageChange,
  itemLabel = 'items',
}: PaginationProps) {
  const startItem = totalItems > 0 ? currentPage * itemsPerPage + 1 : 0;
  const endItem = Math.min((currentPage + 1) * itemsPerPage, totalItems);

  return (
    <nav
      className="flex items-center justify-between border-t border-border-light bg-slate-50/30 px-6 py-3"
      aria-label="Pagination"
    >
      <div className="text-xs text-text-muted">
        {totalItems > 0 ? (
          <>
            Showing <span className="font-medium text-text-main">{startItem}</span> to{' '}
            <span className="font-medium text-text-main">{endItem}</span> of{' '}
            <span className="font-medium text-text-main">{totalItems}</span> {itemLabel}
          </>
        ) : (
          `No ${itemLabel} to display`
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(0, currentPage - 1))}
          disabled={currentPage === 0}
          aria-label="Go to previous page"
          className="flex items-center justify-center border border-border-light bg-white px-3 py-1.5 text-xs font-medium text-text-main disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
        >
          Previous
        </button>
        <span className="text-xs text-text-muted px-2" aria-current="page">
          Page {currentPage + 1} of {Math.max(1, totalPages)}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNext}
          aria-label="Go to next page"
          className="flex items-center justify-center border border-border-light bg-white px-3 py-1.5 text-xs font-medium text-text-main disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
        >
          Next
        </button>
      </div>
    </nav>
  );
}
