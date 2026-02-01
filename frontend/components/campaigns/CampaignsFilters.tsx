'use client';

import { useCallback } from 'react';
import { useDropdown } from '@/hooks/use-dropdown';
import type { CampaignStatus } from '@/features/campaigns/domain/types';

type StatusFilter = CampaignStatus | undefined;
type PlatformFilter = 'Meta' | 'Google' | 'TikTok' | 'Snapchat' | 'X' | 'Klaviyo' | undefined;

interface CampaignsFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilter: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  platformFilter: PlatformFilter;
  onPlatformChange: (platform: PlatformFilter) => void;
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: undefined, label: 'All Status' },
  { value: 'Active', label: 'Active' },
  { value: 'Paused', label: 'Paused' },
  { value: 'Learning', label: 'Learning' },
  { value: 'Inactive', label: 'Inactive' },
];

const PLATFORM_OPTIONS: { value: PlatformFilter; label: string }[] = [
  { value: undefined, label: 'All Platforms' },
  { value: 'Snapchat', label: 'Snapchat' },
  { value: 'Meta', label: 'Meta' },
  { value: 'Google', label: 'Google' },
  { value: 'TikTok', label: 'TikTok' },
  { value: 'X', label: 'X' },
];

export function CampaignsFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  platformFilter,
  onPlatformChange,
}: CampaignsFiltersProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 border border-border-light">
      <div className="flex flex-1 items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted material-symbols-outlined text-[20px]"
            aria-hidden="true"
          >
            search
          </span>
          <input
            className="w-full border border-border-light bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-text-main placeholder-text-subtle focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
            placeholder="Search campaigns..."
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search campaigns"
          />
        </div>

        <div className="h-8 w-px bg-border-light hidden sm:block" aria-hidden="true" />

        {/* Status Filter */}
        <FilterDropdown
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={onStatusChange}
          icon="filter_list"
          placeholder="All Status"
        />

        {/* Platform Filter */}
        <FilterDropdown
          value={platformFilter}
          options={PLATFORM_OPTIONS}
          onChange={onPlatformChange}
          icon="devices"
          placeholder="All Platforms"
        />
      </div>
    </div>
  );
}

interface FilterDropdownProps<T> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  icon: string;
  placeholder: string;
}

function FilterDropdown<T>({
  value,
  options,
  onChange,
  icon,
  placeholder,
}: FilterDropdownProps<T>) {
  const { isOpen, close, containerRef, triggerProps } = useDropdown();

  const handleSelect = useCallback(
    (optionValue: T) => {
      onChange(optionValue);
      close();
    },
    [onChange, close]
  );

  const selectedLabel = options.find((o) => o.value === value)?.label || placeholder;
  const isActive = value !== undefined;

  return (
    <div className="relative" ref={containerRef}>
      <button
        {...triggerProps}
        className={`flex items-center gap-2 border px-3 py-2.5 text-sm font-medium transition-all ${
          isActive
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-border-light bg-white text-text-main hover:bg-slate-50'
        }`}
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
          {icon}
        </span>
        <span>{selectedLabel}</span>
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
          expand_more
        </span>
      </button>
      {isOpen && (
        <ul
          role="listbox"
          className="absolute top-full left-0 mt-2 bg-white border border-border-light shadow-xl z-10 min-w-[160px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {options.map((option) => (
            <li key={option.label}>
              <button
                role="option"
                aria-selected={value === option.value}
                onClick={() => handleSelect(option.value)}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${
                  value === option.value ? 'bg-primary/10 text-primary font-medium' : 'text-text-main'
                }`}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

