// Left panel: every sensor, grouped, one row each.
import type { SensorMetadata } from '../lib/api-client';
import type { sensorView } from '../lib/sensor-display';
import { groupSensors, getLabel, formatValue, formatUnit, formatRange } from '../lib/sensor-display';
import { Card } from './ui/card';
import { AlarmBadge, StatusTag, frameClass, valueClass } from './status-badges';

interface sensorListProps {
  sensors: SensorMetadata[];
  viewByName: Map<string, sensorView>;
}

export function SensorList({ sensors, viewByName }: sensorListProps) {
  const groups = groupSensors(sensors);

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-foreground">All sensors</h2>
        <span className="text-[11px] text-muted-foreground">{sensors.length} sensors</span>
      </div>
      {groups.map((group) => (
        <div key={group.title} className="flex flex-col gap-1.5">
          <h3 className="text-[11px] font-medium tracking-wider text-muted-foreground">{group.title}</h3>
          {group.sensors.map((sensor) => {
            const view = viewByName.get(sensor.sensorName);
            if (!view) {
              return null;
            }
            return <SensorRow key={sensor.sensorId} view={view} />;
          })}
        </div>
      ))}
    </Card>
  );
}

function SensorRow({ view }: { view: sensorView }) {
  let barClass = 'bg-transparent';
  if (view.alarm) {
    barClass = 'bg-destructive';
  } else if (view.outOfRange) {
    barClass = 'bg-warning';
  } else if (view.noData) {
    barClass = 'bg-stale';
  }

  let rowClass = 'border-transparent';
  if (view.noData) {
    rowClass = frameClass(view);
  }

  let valueText = '—';
  if (view.reading) {
    valueText = formatValue(view.reading.value);
  }

  return (
    <div className={`relative flex h-12 items-center gap-2 overflow-hidden rounded-md border bg-muted pl-4 pr-3 ${rowClass}`}>
      <div className={`absolute left-0 top-0 h-full w-[3px] ${barClass}`} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm text-foreground">{getLabel(view.sensor.sensorName)}</span>
        <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="whitespace-nowrap">{formatRange(view.sensor)}</span>
          {(view.alarm || view.lastKnownAlarm) && <AlarmBadge faded={false} />}
        </span>
      </div>
      <span className={`whitespace-nowrap font-mono text-[15px] tabular-nums ${valueClass(view)}`}>
        {valueText}
        <span className="ml-1 text-xs text-muted-foreground">{formatUnit(view.sensor.unit)}</span>
      </span>
      <StatusTag view={view} />
    </div>
  );
}
