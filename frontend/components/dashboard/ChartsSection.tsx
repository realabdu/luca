'use client';

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { DynamicPerformanceChart } from './DynamicPerformanceChart';
import type { DateRange } from './DateRangeSelector';

interface PerformanceDataPoint {
  date: string;
  revenue: number;
  spend: number;
}

interface PlatformSpendData {
  platform: string;
  spend: number;
  percentage: number;
  color: string;
}

interface ChartsSectionProps {
  performance: PerformanceDataPoint[];
  platformSpend: PlatformSpendData[];
  dateRange: DateRange;
  isLoading: boolean;
}

export function ChartsSection({
  performance,
  platformSpend,
  dateRange,
  isLoading,
}: ChartsSectionProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white border border-border-light p-6 h-80">
          <div className="skeleton h-full" />
        </div>
        <div className="bg-white border border-border-light p-6 h-80">
          <div className="skeleton h-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      {/* Performance Chart - Takes 2 columns */}
      <PerformanceChartCard performance={performance} dateRange={dateRange} />

      {/* Platform Spend Chart - Takes 1 column */}
      <PlatformSpendChartCard platformSpend={platformSpend} />
    </div>
  );
}

interface PerformanceChartCardProps {
  performance: PerformanceDataPoint[];
  dateRange: DateRange;
}

function PerformanceChartCard({ performance, dateRange }: PerformanceChartCardProps) {
  const dateRangeLabel = `${dateRange.startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })} - ${dateRange.endDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })}`;

  return (
    <div className="xl:col-span-2 bg-white border border-border-light p-6 flex flex-col">
      <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-base font-semibold text-text-main">Performance Over Time</h3>
          <p className="text-xs text-text-muted mt-1">
            Revenue vs Spend &middot; {dateRangeLabel}
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="size-3 bg-success" aria-hidden="true" />
            <span className="text-text-muted font-medium">Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-0.5 border-t-2 border-dashed border-slate-400"
              aria-hidden="true"
            />
            <span className="text-text-muted font-medium">Spend</span>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-[280px]">
        {performance.length > 0 ? (
          <DynamicPerformanceChart
            data={performance}
            width={800}
            height={280}
            upColor="#10B981"
            downColor="#0891B2"
            spendColor="#94a3b8"
            className="w-full h-full"
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-text-muted">
            <span className="material-symbols-outlined text-[40px] text-slate-300 mb-2" aria-hidden="true">
              show_chart
            </span>
            <span className="text-sm">No performance data available</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface PlatformSpendChartCardProps {
  platformSpend: PlatformSpendData[];
}

function PlatformSpendChartCard({ platformSpend }: PlatformSpendChartCardProps) {
  return (
    <div className="bg-white border border-border-light p-6 flex flex-col">
      <h3 className="text-base font-semibold text-text-main mb-6">Spend by Platform</h3>
      <div className="flex-1 min-h-[200px]">
        {platformSpend.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={platformSpend}
              layout="vertical"
              margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
              barSize={28}
            >
              <XAxis type="number" hide />
              <YAxis
                dataKey="platform"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                width={80}
              />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                content={({ payload, label }) => {
                  if (payload && payload.length) {
                    const data = payload[0].payload as PlatformSpendData;
                    return (
                      <div className="bg-white p-3 border border-border-light shadow-lg">
                        <p className="font-semibold text-text-main mb-1">{label}</p>
                        <p className="text-xs text-text-muted">
                          Spend:{' '}
                          <span className="font-semibold text-text-main">
                            SAR {data.spend.toLocaleString()}
                          </span>
                        </p>
                        <p className="text-xs text-text-muted">
                          Share:{' '}
                          <span className="font-semibold text-text-main">{data.percentage}%</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="percentage" radius={[0, 0, 0, 0]} background={{ fill: '#f1f5f9' }}>
                {platformSpend.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-text-muted">
            <span className="material-symbols-outlined text-[40px] text-slate-300 mb-2" aria-hidden="true">
              pie_chart
            </span>
            <span className="text-sm">No platform data</span>
          </div>
        )}
      </div>

      {/* Legend */}
      {platformSpend.length > 0 && (
        <div className="mt-4 flex flex-col gap-2 pt-4 border-t border-border-light">
          {platformSpend.map((p) => (
            <div key={p.platform} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="size-2.5" style={{ backgroundColor: p.color }} aria-hidden="true" />
                <span className="text-text-main font-medium">{p.platform}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-muted tabular-nums">
                  SAR {p.spend.toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-text-main bg-slate-100 px-2 py-0.5 tabular-nums">
                  {p.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
