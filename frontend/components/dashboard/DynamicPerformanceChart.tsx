"use client";

import React, { useMemo, useId, useState, useCallback } from "react";

interface DataPoint {
  date: string;
  revenue: number;
  spend: number;
}

interface TooltipData {
  x: number;
  y: number;
  revenue: number;
  spend: number;
  date: string;
  spendY: number;
}

interface DynamicPerformanceChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  className?: string;
  upColor?: string;
  downColor?: string;
  spendColor?: string;
}

/**
 * Performance chart with dynamic gradient coloring
 * - Green when the revenue line is going UP
 * - Blue when the revenue line is flat or going DOWN
 */
export function DynamicPerformanceChart({
  data,
  width = 800,
  height = 300,
  className = "",
  upColor = "#22c55e", // green-500
  downColor = "#3b82f6", // blue-500
  spendColor = "#94a3b8", // slate-400
}: DynamicPerformanceChartProps) {
  const gradientId = useId();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { revenuePath, spendPath, gradientStops, xLabels, yLabels, gridLines, tooltipData, chartArea } = useMemo(() => {
    if (data.length < 2) {
      return { revenuePath: "", spendPath: "", gradientStops: [], xLabels: [], yLabels: [], gridLines: [], tooltipData: [], chartArea: { left: 0, right: 0, top: 0, bottom: 0 } };
    }

    const paddingLeft = 60;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Find min/max values for scaling
    const allValues = data.flatMap((d) => [d.revenue, d.spend]);
    const maxVal = Math.max(...allValues);
    const minVal = 0; // Always start from 0
    const range = maxVal - minVal || 1;

    // Calculate points for revenue
    const revenuePoints = data.map((d, i) => ({
      x: paddingLeft + (i / (data.length - 1)) * chartWidth,
      y: paddingTop + chartHeight - ((d.revenue - minVal) / range) * chartHeight,
      value: d.revenue,
      date: d.date,
    }));

    // Calculate points for spend
    const spendPoints = data.map((d, i) => ({
      x: paddingLeft + (i / (data.length - 1)) * chartWidth,
      y: paddingTop + chartHeight - ((d.spend - minVal) / range) * chartHeight,
      value: d.spend,
    }));

    // Create smooth path for revenue using cardinal spline
    const createSmoothPath = (points: { x: number; y: number }[]) => {
      let path = `M ${points[0].x} ${points[0].y}`;
      const tension = 0.25;

      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(points.length - 1, i + 2)];

        const cp1x = p1.x + (p2.x - p0.x) * tension;
        const cp1y = p1.y + (p2.y - p0.y) * tension;
        const cp2x = p2.x - (p3.x - p1.x) * tension;
        const cp2y = p2.y - (p3.y - p1.y) * tension;

        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
      }
      return path;
    };

    const revPath = createSmoothPath(revenuePoints);
    const spdPath = createSmoothPath(spendPoints);

    // Create gradient stops based on direction
    const threshold = range * 0.02;
    const stops: { offset: string; color: string }[] = [];

    for (let i = 0; i < revenuePoints.length; i++) {
      const offset = (i / (revenuePoints.length - 1)) * 100;
      const currentValue = revenuePoints[i].value;
      const nextValue = i < revenuePoints.length - 1 ? revenuePoints[i + 1].value : currentValue;
      const prevValue = i > 0 ? revenuePoints[i - 1].value : currentValue;

      const isGoingUp = nextValue > currentValue + threshold;
      const wasGoingUp = currentValue > prevValue + threshold;
      const color = isGoingUp || wasGoingUp ? upColor : downColor;

      // Add transition stops for smoother color changes
      if (i > 0) {
        const prevIsUp = revenuePoints[i].value > revenuePoints[i - 1].value + threshold;
        const currentIsUp = i < revenuePoints.length - 1 && revenuePoints[i + 1].value > revenuePoints[i].value + threshold;

        if (prevIsUp !== currentIsUp) {
          const transitionOffset = Math.max(0, offset - 0.5);
          stops.push({
            offset: `${transitionOffset}%`,
            color: prevIsUp ? upColor : downColor,
          });
        }
      }

      stops.push({ offset: `${offset}%`, color });
    }

    // Generate X-axis labels (show every nth label based on data length)
    const labelInterval = Math.ceil(data.length / 7);
    const xLbls = data
      .filter((_, i) => i % labelInterval === 0 || i === data.length - 1)
      .map((d) => ({
        text: d.date,
        x: paddingLeft + (data.indexOf(d) / (data.length - 1)) * chartWidth,
        y: height - 10,
      }));

    // Generate Y-axis labels and grid lines
    const yTickCount = 5;
    const yLbls = [];
    const grids = [];
    for (let i = 0; i <= yTickCount; i++) {
      const value = minVal + (range / yTickCount) * i;
      const y = paddingTop + chartHeight - (i / yTickCount) * chartHeight;
      yLbls.push({
        text: formatYLabel(value),
        x: paddingLeft - 10,
        y,
      });
      grids.push({
        y,
        x1: paddingLeft,
        x2: width - paddingRight,
      });
    }

    // Tooltip data (x positions for hover detection)
    const ttData: TooltipData[] = revenuePoints.map((p, i) => ({
      x: p.x,
      y: p.y,
      revenue: data[i].revenue,
      spend: data[i].spend,
      date: data[i].date,
      spendY: spendPoints[i].y,
    }));

    return {
      revenuePath: revPath,
      spendPath: spdPath,
      gradientStops: stops,
      xLabels: xLbls,
      yLabels: yLbls,
      gridLines: grids,
      tooltipData: ttData,
      chartArea: {
        left: paddingLeft,
        right: width - paddingRight,
        top: paddingTop,
        bottom: height - paddingBottom,
      },
    };
  }, [data, width, height, upColor, downColor]);

  // Handle mouse move to find nearest data point
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (tooltipData.length === 0) return;

      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const scaleX = width / rect.width;
      const mouseX = (e.clientX - rect.left) * scaleX;

      // Find the nearest data point
      let nearestIndex = 0;
      let nearestDistance = Infinity;

      tooltipData.forEach((point, i) => {
        const distance = Math.abs(point.x - mouseX);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      });

      // Only show tooltip if mouse is within chart area
      if (mouseX >= chartArea.left && mouseX <= chartArea.right) {
        setHoveredIndex(nearestIndex);
      } else {
        setHoveredIndex(null);
      }
    },
    [tooltipData, width, chartArea]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  if (data.length < 2) {
    return (
      <div className={`flex items-center justify-center text-gray-400 ${className}`} style={{ width, height }}>
        No data available
      </div>
    );
  }

  const hoveredPoint = hoveredIndex !== null ? tooltipData[hoveredIndex] : null;

  return (
    <div className={`relative w-full h-full ${className}`} style={{ minHeight: height }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ display: 'block' }}
      >
        <defs>
          {/* Dynamic gradient for revenue line */}
          <linearGradient id={`revenue-gradient-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="0%">
            {gradientStops.map((stop, i) => (
              <stop key={i} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
        </defs>

        {/* Invisible rect to capture mouse events */}
        <rect x={0} y={0} width={width} height={height} fill="transparent" />

        {/* Grid lines */}
        {gridLines.map((line, i) => (
          <line key={i} x1={line.x1} y1={line.y} x2={line.x2} y2={line.y} stroke="#f1f5f9" strokeDasharray="3 3" />
        ))}

        {/* X-axis labels */}
        {xLabels.map((label, i) => (
          <text key={i} x={label.x} y={label.y} textAnchor="middle" className="text-[12px] fill-slate-500 font-medium">
            {label.text}
          </text>
        ))}

        {/* Y-axis labels */}
        {yLabels.map((label, i) => (
          <text key={i} x={label.x} y={label.y + 4} textAnchor="end" className="text-[12px] fill-slate-500 font-medium">
            {label.text}
          </text>
        ))}

        {/* Revenue line with dynamic gradient */}
        <path d={revenuePath} fill="none" stroke={`url(#revenue-gradient-${gradientId})`} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />

        {/* Spend line (dashed, static color) */}
        <path d={spendPath} fill="none" stroke={spendColor} strokeWidth={2} strokeDasharray="4 4" strokeLinecap="round" strokeLinejoin="round" />

        {/* Hover indicator line */}
        {hoveredPoint && (
          <>
            {/* Vertical dashed line */}
            <line
              x1={hoveredPoint.x}
              y1={chartArea.top}
              x2={hoveredPoint.x}
              y2={chartArea.bottom}
              stroke="#107a76"
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.6}
            />

            {/* Revenue dot */}
            <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r={6} fill="#fff" stroke={upColor} strokeWidth={2} />

            {/* Spend dot */}
            <circle cx={hoveredPoint.x} cy={hoveredPoint.spendY} r={5} fill="#fff" stroke={spendColor} strokeWidth={2} />
          </>
        )}
      </svg>

      {/* Tooltip (HTML overlay for better styling) */}
      {hoveredPoint && (
        <div
          className="absolute pointer-events-none bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg p-3 z-10"
          style={{
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: `${(hoveredPoint.y / height) * 100}%`,
            transform: `translate(${hoveredPoint.x > width * 0.7 ? "-110%" : "10%"}, -50%)`,
          }}
        >
          <p className="text-sm font-bold text-gray-900 mb-2">{hoveredPoint.date}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2" style={{ backgroundColor: upColor }} />
              <span className="text-gray-500">Revenue:</span>
              <span className="font-bold text-gray-900">
                SAR {hoveredPoint.revenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2" style={{ backgroundColor: spendColor }} />
              <span className="text-gray-500">Spend:</span>
              <span className="font-bold text-gray-900">
                SAR {hoveredPoint.spend.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatYLabel(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}k`;
  }
  return value.toFixed(0);
}
