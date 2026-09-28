// A 240 degree arc gauge drawn with plain SVG.
import type { ReactNode } from 'react';
import { getFraction, formatWhole } from '../lib/sensor-display';

const CX = 100;
const CY = 100;
const R = 80;
const START_ANGLE = 150;
const SWEEP = 240;

interface arcGaugeProps {
  value: number | null;
  min: number | null;
  max: number | null;
  colourClass: string;
  strokeWidth: number;
  showLabels: boolean;
  children: ReactNode;
}

function point(angle: number) {
  const radians = (angle * Math.PI) / 180;
  return { x: CX + R * Math.cos(radians), y: CY + R * Math.sin(radians) };
}

function arcPath(fromAngle: number, toAngle: number) {
  const from = point(fromAngle);
  const to = point(toAngle);
  let largeArc = 0;
  if (toAngle - fromAngle > 180) {
    largeArc = 1;
  }
  return `M ${from.x} ${from.y} A ${R} ${R} 0 ${largeArc} 1 ${to.x} ${to.y}`;
}

export function ArcGauge({ value, min, max, colourClass, strokeWidth, showLabels, children }: arcGaugeProps) {
  let valueArc: ReactNode = null;
  if (value !== null && min !== null && max !== null) {
    const fraction = getFraction(value, min, max);
    if (fraction > 0) {
      valueArc = (
        <path
          d={arcPath(START_ANGLE, START_ANGLE + SWEEP * fraction)}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={colourClass}
        />
      );
    }
  }

  const minPoint = point(START_ANGLE);
  const maxPoint = point(START_ANGLE + SWEEP);

  return (
    <div className="relative w-full">
      <svg viewBox="0 0 200 172" className="w-full">
        <path
          d={arcPath(START_ANGLE, START_ANGLE + SWEEP)}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="text-border"
        />
        {valueArc}
        {showLabels && min !== null && (
          <text x={minPoint.x} y={minPoint.y + 26} textAnchor="middle" className="fill-muted-foreground font-mono text-[11px]">
            {formatWhole(min)}
          </text>
        )}
        {showLabels && max !== null && (
          <text x={maxPoint.x} y={maxPoint.y + 26} textAnchor="middle" className="fill-muted-foreground font-mono text-[11px]">
            {formatWhole(max)}
          </text>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pb-4">{children}</div>
    </div>
  );
}
