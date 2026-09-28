// Centre top: the four sensors where a bad value means stop the car, shown biggest.
import type { sensorView } from '../lib/sensor-display';
import { CRITICAL_SENSORS, getLabel, formatValue, formatUnit, formatRange } from '../lib/sensor-display';
import { Card } from './ui/card';
import { ArcGauge } from './arc-gauge';
import { StatusBadges, frameClass, valueClass, shapeClass } from './status-badges';

export function CriticalGauges({ viewByName }: { viewByName: Map<string, sensorView> }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[11px] font-medium tracking-wider text-muted-foreground">CRITICAL · BATTERY & MOTOR</h2>
      <div className="grid grid-cols-2 gap-3">
        {CRITICAL_SENSORS.map((name) => {
          const view = viewByName.get(name);
          if (!view) {
            return null;
          }
          return <CriticalGauge key={name} view={view} />;
        })}
      </div>
    </section>
  );
}

function CriticalGauge({ view }: { view: sensorView }) {
  let value: number | null = null;
  let valueText = '—';
  if (view.reading) {
    value = view.reading.value;
    valueText = formatValue(view.reading.value);
  }

  return (
    <Card className={`flex flex-col p-4 ${frameClass(view)}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{getLabel(view.sensor.sensorName)}</h3>
          <p className="text-[11px] text-muted-foreground">valid {formatRange(view.sensor)}</p>
        </div>
        <StatusBadges view={view} />
      </div>
      <div className="mx-auto w-full max-w-[220px]">
        <ArcGauge value={value} min={view.sensor.min} max={view.sensor.max} colourClass={shapeClass(view)} strokeWidth={14} showLabels={true}>
          <span className={`font-mono text-4xl font-semibold tabular-nums ${valueClass(view)}`}>{valueText}</span>
          <span className="text-xs text-muted-foreground">{formatUnit(view.sensor.unit)}</span>
        </ArcGauge>
      </div>
    </Card>
  );
}
