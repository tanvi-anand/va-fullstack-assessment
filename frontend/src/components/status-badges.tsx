// Shared status pieces (tag, alarm badge, colours) so every part of the dashboard shows a state the same way.
import type { sensorView } from '../lib/sensor-display';
import { getTagText } from '../lib/sensor-display';

export function frameClass(view: sensorView) {
  if (view.noData) {
    return 'border-dashed border-stale opacity-50';
  }
  return 'border-border';
}

export function valueClass(view: sensorView) {
  if (view.outOfRange) {
    return 'text-warning';
  }
  if (view.noData) {
    return 'text-muted-foreground';
  }
  return 'text-foreground';
}

export function shapeClass(view: sensorView) {
  if (view.outOfRange) {
    return 'text-warning';
  }
  if (view.noData) {
    return 'text-stale';
  }
  return 'text-foreground/80';
}

export function fillClass(view: sensorView) {
  if (view.outOfRange) {
    return 'bg-warning';
  }
  if (view.noData) {
    return 'bg-stale';
  }
  return 'bg-foreground/80';
}

export function AlarmBadge({ faded }: { faded: boolean }) {
  let badgeClass = 'bg-destructive text-destructive-foreground';
  if (faded) {
    badgeClass = 'bg-destructive text-destructive-foreground opacity-50';
  }
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold ${badgeClass}`}>
      ⚠ ALARM
    </span>
  );
}

export function StatusTag({ view }: { view: sensorView }) {
  let tagClass = 'bg-success/15 text-success';
  if (view.outOfRange) {
    tagClass = 'bg-warning/15 text-warning';
  } else if (view.noData) {
    tagClass = 'border border-dashed border-stale text-muted-foreground';
  }
  return (
    <span className={`inline-flex h-[22px] min-w-[64px] shrink-0 items-center justify-center whitespace-nowrap rounded px-1.5 font-mono text-[10px] font-semibold ${tagClass}`}>
      {getTagText(view.state, view.age)}
    </span>
  );
}

export function StatusBadges({ view }: { view: sensorView }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {(view.alarm || view.lastKnownAlarm) && <AlarmBadge faded={false} />}
      <StatusTag view={view} />
    </div>
  );
}
