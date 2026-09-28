// Centre bottom: the four driving sensors, each with a small picture that suits it.
import type { ReactNode } from 'react';
import type { sensorView } from '../lib/sensor-display';
import { getLabel, formatValue, formatUnit, formatRange, formatWhole, getFraction } from '../lib/sensor-display';
import { Card } from './ui/card';
import { ArcGauge } from './arc-gauge';
import { StatusBadges, frameClass, valueClass, shapeClass, fillClass } from './status-badges';

export function DrivingCards({ viewByName }: { viewByName: Map<string, sensorView> }) {
  const speed = viewByName.get('VEHICLE_SPEED');
  const steering = viewByName.get('STEERING_ANGLE');
  const brake = viewByName.get('BRAKE_PRESSURE_FRONT');
  const current = viewByName.get('PACK_CURRENT');

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[11px] font-medium tracking-wider text-muted-foreground">DRIVING</h2>
      <div className="grid grid-cols-2 gap-3 min-[1200px]:grid-cols-4">
        {speed && (
          <DrivingCard view={speed}>
            <div className="w-full max-w-[120px]">
              <ArcGauge value={getValue(speed)} min={speed.sensor.min} max={speed.sensor.max} colourClass={shapeClass(speed)} strokeWidth={16} showLabels={false}>
                <span />
              </ArcGauge>
            </div>
          </DrivingCard>
        )}
        {steering && (
          <DrivingCard view={steering}>
            <SteeringWheel view={steering} />
          </DrivingCard>
        )}
        {brake && (
          <DrivingCard view={brake}>
            <VerticalBar view={brake} />
          </DrivingCard>
        )}
        {current && (
          <DrivingCard view={current}>
            <CentreBar view={current} />
          </DrivingCard>
        )}
      </div>
    </section>
  );
}

function getValue(view: sensorView) {
  if (view.reading) {
    return view.reading.value;
  }
  return null;
}

function DrivingCard({ view, children }: { view: sensorView; children: ReactNode }) {
  let valueText = '—';
  if (view.reading) {
    valueText = formatValue(view.reading.value);
  }

  return (
    <Card className={`flex min-w-0 flex-col gap-2 p-3 ${frameClass(view)}`}>
      <div>
        <h3 className="text-sm font-semibold leading-tight text-foreground">{getLabel(view.sensor.sensorName)}</h3>
        <p className="truncate text-[11px] text-muted-foreground">valid {formatRange(view.sensor)}</p>
      </div>
      <div className="flex h-28 items-center justify-center">{children}</div>
      <div className="whitespace-nowrap">
        <span className={`font-mono text-2xl font-semibold tabular-nums ${valueClass(view)}`}>{valueText}</span>
        <span className="ml-1 text-xs text-muted-foreground">{formatUnit(view.sensor.unit)}</span>
      </div>
      <StatusBadges view={view} />
    </Card>
  );
}

function SteeringWheel({ view }: { view: sensorView }) {
  let angle = 0;
  if (view.reading) {
    angle = view.reading.value;
  }
  return (
    <svg viewBox="0 0 100 100" className={`h-24 w-24 ${shapeClass(view)}`}>
      <g transform={`rotate(${angle} 50 50)`}>
        <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="8" />
        <circle cx="50" cy="50" r="9" fill="currentColor" />
        <line x1="12" y1="50" x2="41" y2="50" stroke="currentColor" strokeWidth="7" />
        <line x1="59" y1="50" x2="88" y2="50" stroke="currentColor" strokeWidth="7" />
        <line x1="50" y1="59" x2="50" y2="88" stroke="currentColor" strokeWidth="7" />
        <rect x="45" y="6" width="10" height="12" rx="2" className="fill-background" />
      </g>
    </svg>
  );
}

function VerticalBar({ view }: { view: sensorView }) {
  const min = view.sensor.min;
  const max = view.sensor.max;
  let percent = 0;
  if (view.reading && min !== null && max !== null) {
    percent = getFraction(view.reading.value, min, max) * 100;
  }

  let topLabel = '';
  let middleLabel = '';
  let bottomLabel = '';
  if (min !== null && max !== null) {
    topLabel = formatWhole(max);
    middleLabel = formatWhole((min + max) / 2);
    bottomLabel = formatWhole(min);
  }

  return (
    <div className="flex h-full items-stretch gap-2">
      <div className="relative w-6 overflow-hidden rounded bg-border">
        <div className={`absolute bottom-0 left-0 w-full ${fillClass(view)}`} style={{ height: `${percent}%` }} />
      </div>
      <div className="flex flex-col justify-between font-mono text-[10px] text-muted-foreground">
        <span>{topLabel}</span>
        <span>{middleLabel}</span>
        <span>{bottomLabel}</span>
      </div>
    </div>
  );
}

function CentreBar({ view }: { view: sensorView }) {
  const min = view.sensor.min;
  const max = view.sensor.max;
  let left = 50;
  let width = 0;
  let zeroPercent = 50;
  if (min !== null && max !== null) {
    zeroPercent = getFraction(0, min, max) * 100;
    left = zeroPercent;
    if (view.reading) {
      const valuePercent = getFraction(view.reading.value, min, max) * 100;
      if (valuePercent < zeroPercent) {
        left = valuePercent;
        width = zeroPercent - valuePercent;
      } else {
        width = valuePercent - zeroPercent;
      }
    }
  }

  let minLabel = '';
  let maxLabel = '';
  if (min !== null && max !== null) {
    minLabel = formatWhole(min);
    maxLabel = `+${formatWhole(max)}`;
  }

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="relative h-4 w-full rounded bg-border">
        <div className={`absolute top-0 h-full rounded ${fillClass(view)}`} style={{ left: `${left}%`, width: `${width}%` }} />
        <div className="absolute -top-1 h-6 w-px bg-muted-foreground" style={{ left: `${zeroPercent}%` }} />
      </div>
      <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>{minLabel}</span>
        <span>0</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
