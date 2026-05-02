import React from "react";
import { cn } from "@/lib/utils";

interface GaugeProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}

export function Gauge({ value, size = 120, strokeWidth = 10, label, className }: GaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  let colorClass = "text-red-500";
  if (value >= 70) {
    colorClass = "text-green-500";
  } else if (value >= 40) {
    colorClass = "text-yellow-500";
  }

  return (
    <div className={cn("flex flex-col items-center justify-center relative", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-200 dark:text-slate-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn("transition-all duration-1000 ease-out", colorClass)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tracking-tighter text-slate-900">{value}</span>
        {label && <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mt-1">{label}</span>}
      </div>
    </div>
  );
}
