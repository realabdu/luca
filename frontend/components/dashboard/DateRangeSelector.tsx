'use client';

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year'
  | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  preset: DatePreset;
  compareEnabled: boolean;
  compareStartDate?: Date;
  compareEndDate?: Date;
}

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'last_quarter', label: 'Last Quarter' },
  { value: 'this_year', label: 'This Year' },
  { value: 'last_year', label: 'Last Year' },
];

export function getDateRangeFromPreset(preset: DatePreset): { startDate: Date; endDate: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'today':
      return { startDate: today, endDate: today };

    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { startDate: yesterday, endDate: yesterday };
    }

    case 'last_7_days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { startDate: start, endDate: today };
    }

    case 'last_30_days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { startDate: start, endDate: today };
    }

    case 'this_week': {
      const start = new Date(today);
      const day = start.getDay();
      const diff = day === 0 ? 6 : day - 1; // Monday is first day
      start.setDate(start.getDate() - diff);
      return { startDate: start, endDate: today };
    }

    case 'last_week': {
      const endOfLastWeek = new Date(today);
      const day = endOfLastWeek.getDay();
      const diff = day === 0 ? 6 : day - 1;
      endOfLastWeek.setDate(endOfLastWeek.getDate() - diff - 1);
      const startOfLastWeek = new Date(endOfLastWeek);
      startOfLastWeek.setDate(startOfLastWeek.getDate() - 6);
      return { startDate: startOfLastWeek, endDate: endOfLastWeek };
    }

    case 'this_month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: start, endDate: today };
    }

    case 'last_month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { startDate: start, endDate: end };
    }

    case 'this_quarter': {
      const quarter = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), quarter * 3, 1);
      return { startDate: start, endDate: today };
    }

    case 'last_quarter': {
      const quarter = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), (quarter - 1) * 3, 1);
      const end = new Date(today.getFullYear(), quarter * 3, 0);
      return { startDate: start, endDate: end };
    }

    case 'this_year': {
      const start = new Date(today.getFullYear(), 0, 1);
      return { startDate: start, endDate: today };
    }

    case 'last_year': {
      const start = new Date(today.getFullYear() - 1, 0, 1);
      const end = new Date(today.getFullYear() - 1, 11, 31);
      return { startDate: start, endDate: end };
    }

    default:
      return { startDate: today, endDate: today };
  }
}

export function getComparisonRange(startDate: Date, endDate: Date): { startDate: Date; endDate: Date } {
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const compareEnd = new Date(startDate);
  compareEnd.setDate(compareEnd.getDate() - 1);
  const compareStart = new Date(compareEnd);
  compareStart.setDate(compareStart.getDate() - daysDiff + 1);
  return { startDate: compareStart, endDate: compareEnd };
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(value.preset === 'custom');
  const [customStart, setCustomStart] = useState(formatDateInput(value.startDate));
  const [customEnd, setCustomEnd] = useState(formatDateInput(value.endDate));
  const [activeIndex, setActiveIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape and handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Reset active index when opening
  useEffect(() => {
    if (isOpen) {
      const currentIndex = PRESETS.findIndex((p) => p.value === value.preset);
      setActiveIndex(currentIndex >= 0 ? currentIndex : 0);
    }
  }, [isOpen, value.preset]);

  const handleKeyNavigation = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setActiveIndex((prev) => (prev < PRESETS.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : PRESETS.length - 1));
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (activeIndex >= 0 && activeIndex < PRESETS.length) {
            handlePresetSelect(PRESETS[activeIndex].value);
          }
          break;
        case 'Home':
          event.preventDefault();
          setActiveIndex(0);
          break;
        case 'End':
          event.preventDefault();
          setActiveIndex(PRESETS.length - 1);
          break;
      }
    },
    [isOpen, activeIndex]
  );

  const handlePresetSelect = (preset: DatePreset) => {
    const { startDate, endDate } = getDateRangeFromPreset(preset);
    const comparison = getComparisonRange(startDate, endDate);

    onChange({
      startDate,
      endDate,
      preset,
      compareEnabled: value.compareEnabled,
      compareStartDate: comparison.startDate,
      compareEndDate: comparison.endDate,
    });
    setShowCustom(false);
    setIsOpen(false);
  };

  const handleCustomApply = () => {
    const startDate = new Date(customStart);
    const endDate = new Date(customEnd);
    const comparison = getComparisonRange(startDate, endDate);

    onChange({
      startDate,
      endDate,
      preset: 'custom',
      compareEnabled: value.compareEnabled,
      compareStartDate: comparison.startDate,
      compareEndDate: comparison.endDate,
    });
    setIsOpen(false);
  };

  const handleCompareToggle = () => {
    const comparison = getComparisonRange(value.startDate, value.endDate);
    onChange({
      ...value,
      compareEnabled: !value.compareEnabled,
      compareStartDate: comparison.startDate,
      compareEndDate: comparison.endDate,
    });
  };

  const displayLabel = value.preset === 'custom'
    ? `${formatDateShort(value.startDate)} - ${formatDateShort(value.endDate)}`
    : PRESETS.find(p => p.value === value.preset)?.label || 'Last 30 Days';

  return (
    <div className="relative" ref={dropdownRef} onKeyDown={handleKeyNavigation}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Date range: ${displayLabel}${value.compareEnabled ? ', comparing to previous period' : ''}`}
        className="flex items-center gap-2 border border-border-light bg-white px-3 py-2 text-sm font-medium text-text-main shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
      >
        <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">calendar_today</span>
        <span>{displayLabel}</span>
        {value.compareEnabled && (
          <span className="text-[10px] text-primary font-semibold bg-primary/10 px-1.5 py-0.5">
            vs prev
          </span>
        )}
        <span className="material-symbols-outlined text-[16px] text-text-muted ml-1" aria-hidden="true">
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-border-light shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Presets */}
          <div className="p-2 border-b border-border-light" role="listbox" aria-label="Date range presets">
            <div className="grid grid-cols-2 gap-1">
              {PRESETS.map((preset, index) => (
                <button
                  key={preset.value}
                  role="option"
                  aria-selected={value.preset === preset.value}
                  onClick={() => handlePresetSelect(preset.value)}
                  className={`
                    px-3 py-2 text-sm text-left transition-all
                    ${value.preset === preset.value
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-text-main hover:bg-slate-50'
                    }
                    ${activeIndex === index ? 'ring-2 ring-primary/50 ring-inset' : ''}
                  `}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Range */}
          <div className="p-3 border-b border-border-light">
            <button
              onClick={() => setShowCustom(!showCustom)}
              aria-expanded={showCustom}
              className="flex items-center gap-2 text-sm font-medium text-text-main w-full hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">date_range</span>
              Custom Range
              <span className="material-symbols-outlined text-[16px] ml-auto" aria-hidden="true">
                {showCustom ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {showCustom && (
              <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">Start Date</label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-border-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">End Date</label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-border-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCustomApply}
                  className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-colors shadow-sm"
                >
                  Apply Custom Range
                </button>
              </div>
            )}
          </div>

          {/* Compare Toggle */}
          <div className="p-3 bg-slate-50/50">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={value.compareEnabled}
                  onChange={handleCompareToggle}
                  className="sr-only"
                />
                <div className={`
                  w-10 h-6 transition-all
                  ${value.compareEnabled ? 'bg-primary' : 'bg-slate-200'}
                `}>
                  <div className={`
                    absolute top-1 left-1 w-4 h-4 bg-white shadow-sm transition-transform
                    ${value.compareEnabled ? 'translate-x-4' : ''}
                  `} />
                </div>
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-text-main group-hover:text-primary transition-colors">
                  Compare to previous period
                </span>
                {value.compareEnabled && value.compareStartDate && value.compareEndDate && (
                  <p className="text-xs text-text-muted mt-0.5">
                    {formatDateShort(value.compareStartDate)} - {formatDateShort(value.compareEndDate)}
                  </p>
                )}
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

// Default date range (last 30 days)
export function getDefaultDateRange(): DateRange {
  const { startDate, endDate } = getDateRangeFromPreset('last_30_days');
  const comparison = getComparisonRange(startDate, endDate);

  return {
    startDate,
    endDate,
    preset: 'last_30_days',
    compareEnabled: false,
    compareStartDate: comparison.startDate,
    compareEndDate: comparison.endDate,
  };
}
