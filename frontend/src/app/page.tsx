// The dashboard page: loads sensors and readings from the API and lays out every panel.
'use client';

import { useEffect, useState } from 'react';
import { fetchSensors, fetchLatestTelemetry } from '../lib/api-client';
import type { SensorMetadata, TelemetryReading } from '../lib/api-client';
import type { sensorView } from '../lib/sensor-display';
import { getSensorView, summarise, getAttentionItems } from '../lib/sensor-display';
import { SensorList } from '../components/sensor-list';
import { DashboardHeader } from '../components/dashboard-header';
import type { pillState } from '../components/dashboard-header';
import { StatusScreen } from '../components/status-screen';
import { CriticalGauges } from '../components/critical-gauges';
import { DrivingCards } from '../components/driving-cards';
import { TyreCard } from '../components/tyre-card';
import { AttentionPanel } from '../components/attention-panel';

type connectionState = 'checking' | 'starting' | 'unreachable' | 'connected';

const SENSORS_RETRY_MS = 2000;
const POLL_MS = 1000;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function Page() {
  const [sensors, setSensors] = useState<SensorMetadata[]>([]);
  const [readings, setReadings] = useState<TelemetryReading[]>([]);
  const [connection, setConnection] = useState<connectionState>('checking');
  const [now, setNow] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadSensors() {
      while (!cancelled) {
        setNow(Date.now() / 1000);
        try {
          const sensorList = await fetchSensors();
          if (sensorList !== null) {
            setSensors(sensorList);
            return;
          }
          setConnection('starting');
        } catch {
          setConnection('unreachable');
        }
        await wait(SENSORS_RETRY_MS);
      }
    }

    async function pollTelemetry() {
      while (!cancelled) {
        try {
          const latest = await fetchLatestTelemetry();
          setReadings(latest);
          setConnection('connected');
        } catch {
          setConnection('unreachable');
        }
        setNow(Date.now() / 1000);
        await wait(POLL_MS);
      }
    }

    async function run() {
      await loadSensors();
      await pollTelemetry();
    }

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  const readingById = new Map<number, TelemetryReading>();
  for (const reading of readings) {
    readingById.set(reading.sensorId, reading);
  }

  const views: sensorView[] = [];
  const viewByName = new Map<string, sensorView>();
  for (const sensor of sensors) {
    const view = getSensorView(sensor, readingById.get(sensor.sensorId), now);
    views.push(view);
    viewByName.set(sensor.sensorName, view);
  }

  const summary = summarise(views);

  let pill: pillState = 'live';
  if (connection === 'checking') {
    pill = 'checking';
  } else if (connection === 'starting') {
    pill = 'starting';
  } else if (connection === 'unreachable') {
    pill = 'unreachable';
  } else if (summary.allNoData) {
    pill = 'no_new_data';
  }

  const attentionItems = getAttentionItems(views, pill === 'unreachable');

  let statusKind: 'starting' | 'unreachable' | null = null;
  if (sensors.length === 0 && connection === 'starting') {
    statusKind = 'starting';
  } else if (sensors.length === 0 && connection === 'unreachable') {
    statusKind = 'unreachable';
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <DashboardHeader pill={pill} summary={summary} now={now} />
      {statusKind !== null && <StatusScreen kind={statusKind} />}
      {sensors.length > 0 && (
        <div className="grid grid-cols-1 gap-3 p-3 min-[1200px]:grid-cols-[380px_minmax(0,1fr)_290px] 2xl:grid-cols-[404px_minmax(0,1fr)_320px]">
          <SensorList sensors={sensors} viewByName={viewByName} />
          <div className="flex min-w-0 flex-col gap-4">
            <CriticalGauges viewByName={viewByName} />
            <DrivingCards viewByName={viewByName} />
          </div>
          <div className="flex flex-col gap-3">
            <TyreCard viewByName={viewByName} />
            <AttentionPanel items={attentionItems} />
          </div>
        </div>
      )}
    </main>
  );
}
