'use client';

import { useCallback, useMemo, useState } from 'react';

export interface UseFiltersOptions<T extends Record<string, unknown>> {
  /** Initial filter values */
  initialValues: T;
  /** Callback when any filter changes */
  onChange?: (filters: T) => void;
}

export interface UseFiltersReturn<T extends Record<string, unknown>> {
  /** Current filter values */
  filters: T;
  /** Set a single filter value */
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void;
  /** Set multiple filter values at once */
  setFilters: (updates: Partial<T>) => void;
  /** Reset all filters to initial values */
  resetFilters: () => void;
  /** Reset a single filter to its initial value */
  resetFilter: <K extends keyof T>(key: K) => void;
  /** Check if filters have been modified from initial values */
  isDirty: boolean;
  /** Get the count of active (non-default) filters */
  activeFilterCount: number;
}

/**
 * Hook for consolidating multiple filter useState calls into a single state object.
 * Provides utilities for setting, resetting, and tracking filter state.
 *
 * @example
 * interface CampaignFilters {
 *   search: string;
 *   status: 'Active' | 'Paused' | 'All' | undefined;
 *   platform: string | undefined;
 *   dateRange: { start: Date; end: Date } | undefined;
 * }
 *
 * function CampaignsPage() {
 *   const {
 *     filters,
 *     setFilter,
 *     resetFilters,
 *     isDirty,
 *     activeFilterCount
 *   } = useFilters<CampaignFilters>({
 *     initialValues: {
 *       search: '',
 *       status: undefined,
 *       platform: undefined,
 *       dateRange: undefined,
 *     },
 *   });
 *
 *   return (
 *     <div>
 *       <input
 *         value={filters.search}
 *         onChange={(e) => setFilter('search', e.target.value)}
 *       />
 *       <select
 *         value={filters.status ?? ''}
 *         onChange={(e) => setFilter('status', e.target.value || undefined)}
 *       >
 *         <option value="">All Statuses</option>
 *         <option value="Active">Active</option>
 *         <option value="Paused">Paused</option>
 *       </select>
 *       {isDirty && (
 *         <button onClick={resetFilters}>
 *           Clear {activeFilterCount} filters
 *         </button>
 *       )}
 *     </div>
 *   );
 * }
 */
export function useFilters<T extends Record<string, unknown>>(
  options: UseFiltersOptions<T>
): UseFiltersReturn<T> {
  const { initialValues, onChange } = options;
  const [filters, setFiltersState] = useState<T>(initialValues);

  const setFilter = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setFiltersState((prev) => {
        const updated = { ...prev, [key]: value };
        onChange?.(updated);
        return updated;
      });
    },
    [onChange]
  );

  const setFilters = useCallback(
    (updates: Partial<T>) => {
      setFiltersState((prev) => {
        const updated = { ...prev, ...updates };
        onChange?.(updated);
        return updated;
      });
    },
    [onChange]
  );

  const resetFilters = useCallback(() => {
    setFiltersState(initialValues);
    onChange?.(initialValues);
  }, [initialValues, onChange]);

  const resetFilter = useCallback(
    <K extends keyof T>(key: K) => {
      setFiltersState((prev) => {
        const updated = { ...prev, [key]: initialValues[key] };
        onChange?.(updated);
        return updated;
      });
    },
    [initialValues, onChange]
  );

  const { isDirty, activeFilterCount } = useMemo(() => {
    const keys = Object.keys(initialValues) as (keyof T)[];

    const isDirty = keys.some((key) => filters[key] !== initialValues[key]);

    // Count filters with truthy values (empty strings, null, undefined, false don't count)
    const activeFilterCount = keys.filter((key) => {
      const value = filters[key];
      return value !== undefined && value !== null && value !== '' && value !== false;
    }).length;

    return { isDirty, activeFilterCount };
  }, [filters, initialValues]);

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    resetFilter,
    isDirty,
    activeFilterCount,
  };
}
