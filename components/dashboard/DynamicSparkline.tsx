"use client";

import React, { useMemo, useState, useCallback, useId } from "react";

interface DynamicSparklineProps {
  data: { value: number }[];
  width?: number;
  height?: number;
  className?: string;
  upColor?: string;
  downColor?: string;
  strokeWidth?: number;
  showTooltip?: boolean;
}

/**
 * Dynamic Sparkline with gradient coloring based on direction
 * - Green when the line is going UP
 * - Blue when the line is flat or going DOWN
 */
export function DynamicSparkline({
  data,
  width = 200,
  height = 40,
  className = "",
  upColor = "#10b981", // emerald-500
  downColor = "#3b82f6", // blue-500
  strokeWidth = 2,
}: DynamicSparklineProps) {
  const { segments, gradientId } = useMemo(() => {
    if (data.length < 2) return { segments: [], gradientId: "" };

    const values = data.map((d) => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    // Padding for visual clarity
    const paddingX = 4;
    const paddingY = 4;
    const chartWidth = width - paddingX * 2;
    const chartHeight = height - paddingY * 2;

    // Calculate points
    const points = data.map((d, i) => ({
      x: paddingX + (i / (data.length - 1)) * chartWidth,
      y: paddingY + chartHeight - ((d.value - minVal) / range) * chartHeight,
      value: d.value,
    }));

    // Create segments with direction info
    const segs: { x1: number; y1: number; x2: number; y2: number; isUp: boolean }[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      segs.push({
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        isUp: p2.value > p1.value,
      });
    }

    // Generate unique gradient ID
    const id = `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`;

    return { segments: segs, gradientId: id };
  }, [data, width, height]);

  if (data.length < 2) {
    return <div className={className} style={{ width, height }} />;
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ overflow: "visible" }}
    >
      <defs>
        {/* Gradient definitions for smooth transitions */}
        {segments.map((seg, i) => {
          const nextSeg = segments[i + 1];
          const currentColor = seg.isUp ? upColor : downColor;
          const nextColor = nextSeg ? (nextSeg.isUp ? upColor : downColor) : currentColor;

          return (
            <linearGradient
              key={`grad-${i}`}
              id={`${gradientId}-${i}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor={currentColor} />
              <stop offset="100%" stopColor={nextColor} />
            </linearGradient>
          );
        })}
      </defs>

      {/* Draw each segment with its gradient */}
      {segments.map((seg, i) => (
        <line
          key={i}
          x1={seg.x1}
          y1={seg.y1}
          x2={seg.x2}
          y2={seg.y2}
          stroke={`url(#${gradientId}-${i})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

interface PointData {
  x: number;
  y: number;
  value: number;
}

/**
 * Smoother version using path with curve interpolation
 * Colors change based on direction: green when going UP, blue when flat/DOWN
 * Includes hover tooltip functionality
 */
export function DynamicSparklineSmooth({
  data,
  width = 200,
  height = 40,
  className = "",
  upColor = "#22c55e", // green-500
  downColor = "#3b82f6", // blue-500
  strokeWidth = 2,
  showTooltip = true,
}: DynamicSparklineProps) {
  const gradientId = useId();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { pathData, gradientStops, points } = useMemo(() => {
    if (data.length < 2) return { pathData: "", gradientStops: [], points: [] };

    const values = data.map((d) => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const paddingX = 2;
    const paddingY = 6;
    const chartWidth = width - paddingX * 2;
    const chartHeight = height - paddingY * 2;

    // Calculate points with direction info
    const pts: PointData[] = data.map((d, i) => ({
      x: paddingX + (i / (data.length - 1)) * chartWidth,
      y: paddingY + chartHeight - ((d.value - minVal) / range) * chartHeight,
      value: d.value,
    }));

    // Create smooth path using cardinal spline
    let path = `M ${pts[0].x} ${pts[0].y}`;

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];

      // Catmull-Rom to Bezier conversion with smooth tension
      const tension = 0.25;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    // Create gradient stops
    const stops: { offset: string; color: string }[] = [];
    const threshold = range * 0.02;

    for (let i = 0; i < pts.length; i++) {
      const offset = (i / (pts.length - 1)) * 100;
      const nextValue = i < pts.length - 1 ? pts[i + 1].value : pts[i].value;
      const prevValue = i > 0 ? pts[i - 1].value : pts[i].value;
      const currentValue = pts[i].value;

      const isGoingUp = nextValue > currentValue + threshold;
      const wasGoingUp = currentValue > prevValue + threshold;
      const color = isGoingUp || wasGoingUp ? upColor : downColor;

      if (i > 0) {
        const prevIsUp = pts[i].value > pts[i - 1].value + threshold;
        const currentIsUp = i < pts.length - 1 && pts[i + 1].value > pts[i].value + threshold;

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

    return { pathData: path, gradientStops: stops, points: pts };
  }, [data, width, height, upColor, downColor]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!showTooltip || points.length === 0) return;

      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const scaleX = width / rect.width;
      const mouseX = (e.clientX - rect.left) * scaleX;

      // Find nearest point
      let nearestIndex = 0;
      let nearestDistance = Infinity;

      points.forEach((point, i) => {
        const distance = Math.abs(point.x - mouseX);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      });

      setHoveredIndex(nearestIndex);
    },
    [points, width, showTooltip]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  if (data.length < 2) {
    return <div className={className} style={{ width, height }} />;
  }

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className={`relative ${className}`} style={{ width: "100%", height: "100%" }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ display: "block", cursor: showTooltip ? "crosshair" : "default" }}
      >
        <defs>
          <linearGradient id={`gradient-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="0%">
            {gradientStops.map((stop, i) => (
              <stop key={i} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
        </defs>

        {/* Invisible rect to capture mouse events */}
        <rect x={0} y={0} width={width} height={height} fill="transparent" />

        {/* Main line */}
        <path
          d={pathData}
          fill="none"
          stroke={`url(#gradient-${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Hover dot */}
        {hoveredPoint && (
          <circle
            cx={hoveredPoint.x}
            cy={hoveredPoint.y}
            r={4}
            fill="#fff"
            stroke={upColor}
            strokeWidth={2}
          />
        )}
      </svg>

      {/* Tooltip */}
      {showTooltip && hoveredPoint && (
        <div
          className="absolute pointer-events-none bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg z-50 whitespace-nowrap"
          style={{
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: 0,
            transform: `translateX(${hoveredPoint.x > width * 0.7 ? "-100%" : "0"})`,
          }}
        >
          {hoveredPoint.value.toLocaleString("en-US", { maximumFractionDigits: 2 })}
        </div>
      )}
    </div>
  );
}
