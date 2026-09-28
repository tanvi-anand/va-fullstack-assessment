// Right top: the car seen from above, each tyre coloured by its pressure status.
import type { sensorView } from '../lib/sensor-display';
import { formatValue, formatUnit, formatRange } from '../lib/sensor-display';
import { Card } from './ui/card';
import { StatusBadges, valueClass, shapeClass } from './status-badges';

export function TyreCard({ viewByName }: { viewByName: Map<string, sensorView> }) {
  const fl = viewByName.get('TYRE_PRESSURE_FL');
  const fr = viewByName.get('TYRE_PRESSURE_FR');
  const rl = viewByName.get('TYRE_PRESSURE_RL');
  const rr = viewByName.get('TYRE_PRESSURE_RR');

  let rangeText = '';
  if (fl) {
    rangeText = `valid ${formatRange(fl.sensor)}`;
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-foreground">Tyre pressure</h2>
        <span className="text-[11px] text-muted-foreground">{rangeText}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TyreReadout label="FL" view={fl} alignRight={false} />
        <CarFromAbove fl={fl} fr={fr} rl={rl} rr={rr} />
        <TyreReadout label="FR" view={fr} alignRight={true} />
        <TyreReadout label="RL" view={rl} alignRight={false} />
        <TyreReadout label="RR" view={rr} alignRight={true} />
      </div>
    </Card>
  );
}

interface tyreReadoutProps {
  label: string;
  view: sensorView | undefined;
  alignRight: boolean;
}

function TyreReadout({ label, view, alignRight }: tyreReadoutProps) {
  let alignClass = 'items-start text-left';
  if (alignRight) {
    alignClass = 'items-end text-right';
  }
  if (!view) {
    return <div className={`flex flex-col ${alignClass}`}><span className="text-xs text-muted-foreground">{label}</span></div>;
  }

  let fadeClass = '';
  if (view.noData) {
    fadeClass = 'opacity-50';
  }

  let valueText = '—';
  if (view.reading) {
    valueText = formatValue(view.reading.value);
  }

  return (
    <div className={`flex flex-col gap-1 ${alignClass} ${fadeClass}`}>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <span className="whitespace-nowrap">
        <span className={`font-mono text-lg font-semibold tabular-nums ${valueClass(view)}`}>{valueText}</span>
        <span className="ml-1 text-[11px] text-muted-foreground">{formatUnit(view.sensor.unit)}</span>
      </span>
      <StatusBadges view={view} />
    </div>
  );
}

interface carProps {
  fl: sensorView | undefined;
  fr: sensorView | undefined;
  rl: sensorView | undefined;
  rr: sensorView | undefined;
}

function CarFromAbove({ fl, fr, rl, rr }: carProps) {
  return (
    <svg viewBox="0 0 90 180" className="row-span-2 h-40 w-auto">
      <text x="45" y="9" textAnchor="middle" className="fill-muted-foreground text-[8px]">FRONT</text>
      <rect x="32" y="16" width="26" height="150" rx="10" className="fill-muted" />
      <rect x="18" y="22" width="54" height="6" rx="2" className="fill-muted" />
      <rect x="18" y="156" width="54" height="8" rx="2" className="fill-muted" />
      <Tyre x={6} y={34} view={fl} />
      <Tyre x={68} y={34} view={fr} />
      <Tyre x={6} y={116} view={rl} />
      <Tyre x={68} y={116} view={rr} />
    </svg>
  );
}

function Tyre({ x, y, view }: { x: number; y: number; view: sensorView | undefined }) {
  if (!view || view.noData) {
    let colour = 'text-stale';
    if (view) {
      colour = shapeClass(view);
    }
    return (
      <rect x={x} y={y} width="16" height="32" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" className={colour} />
    );
  }
  let colour = 'text-muted-foreground/60';
  if (view.outOfRange) {
    colour = 'text-warning';
  }
  return <rect x={x} y={y} width="16" height="32" rx="4" fill="currentColor" className={colour} />;
}
