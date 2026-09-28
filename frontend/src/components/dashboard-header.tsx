// Top bar: title, connection pill, summary chips and clock.
import Image from 'next/image';
import type { dashboardSummary } from '../lib/sensor-display';

export type pillState = 'checking' | 'live' | 'no_new_data' | 'unreachable' | 'starting';

interface headerProps {
  pill: pillState;
  summary: dashboardSummary;
  now: number;
}

interface chipProps {
  count: number;
  singular: string;
  plural: string;
  activeClass: string;
  suffix: string;
}

function plural(count: number, singular: string, pluralWord: string) {
  if (count === 1) {
    return singular;
  }
  return pluralWord;
}

function Chip({ count, singular, plural: pluralWord, activeClass, suffix }: chipProps) {
  let chipClass = 'border border-border text-muted-foreground';
  if (count > 0) {
    chipClass = activeClass;
  }
  return (
    <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${chipClass}`}>
      {count} {plural(count, singular, pluralWord)}{suffix}
    </span>
  );
}

function ConnectionPill({ pill }: { pill: pillState }) {
  let pillClass = 'bg-success/15 text-success';
  let title = 'Live';
  let detail = 'API connected';
  if (pill === 'checking') {
    pillClass = 'border border-border text-muted-foreground';
    title = 'Connecting…';
    detail = 'checking the API';
  } else if (pill === 'no_new_data') {
    pillClass = 'bg-warning/15 text-warning';
    title = 'No new data';
    detail = 'API up, but no sensor has sent anything for 3s+';
  } else if (pill === 'unreachable') {
    pillClass = 'bg-destructive text-destructive-foreground';
    title = 'API unreachable';
    detail = 'retrying every second';
  } else if (pill === 'starting') {
    pillClass = 'bg-warning/15 text-warning';
    title = 'Starting up';
    detail = 'waiting for sensor names';
  }

  return (
    <span className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1 text-xs ${pillClass}`}>
      <span className="h-2 w-2 rounded-full bg-current" />
      <span className="font-semibold">{title}</span>
      <span className="opacity-80">{detail}</span>
    </span>
  );
}

export function DashboardHeader({ pill, summary, now }: headerProps) {
  let headerClass = 'bg-background';
  if (pill === 'unreachable') {
    headerClass = 'bg-destructive/20';
  }

  let clock = '--:--:--';
  if (now > 0) {
    clock = new Date(now * 1000).toLocaleTimeString('en-AU', { hour12: false });
  }

  let alarmCount = summary.alarms;
  let alarmSuffix = '';
  let alarmClass = 'bg-destructive text-destructive-foreground';
  if (summary.alarms === 0 && summary.lastKnownAlarms > 0) {
    alarmCount = summary.lastKnownAlarms;
    alarmSuffix = ' (last known)';
    alarmClass = 'bg-destructive text-destructive-foreground opacity-50';
  }

  return (
    <header className={`flex h-16 items-center justify-between gap-4 border-b border-border px-4 ${headerClass}`}>
      <div className="flex items-center gap-3">
        <Image src="/logo-darkmode.svg" alt="Logo" width={28} height={28} />
        <div>
          <h1 className="text-sm font-semibold">Vehicle telemetry</h1>
          <p className="text-xs text-muted-foreground">Redback Racing · pit wall view</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ConnectionPill pill={pill} />
        {pill === 'unreachable' && summary.freshestAge !== null && (
          <span className="whitespace-nowrap text-xs font-medium text-foreground">
            Every value below is at least {Math.floor(summary.freshestAge)}s old.
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Chip count={alarmCount} singular="alarm" plural="alarms" activeClass={alarmClass} suffix={alarmSuffix} />
        <Chip count={summary.outOfRange} singular="out of range" plural="out of range" activeClass="bg-warning/15 text-warning" suffix="" />
        <Chip count={summary.noData} singular="no data" plural="no data" activeClass="border border-dashed border-stale text-muted-foreground" suffix="" />
        <span className="ml-2 font-mono text-sm tabular-nums text-muted-foreground">{clock}</span>
      </div>
    </header>
  );
}
