// Display logic only: turns sensors and readings into what each part of the dashboard shows.
import type { SensorMetadata, TelemetryReading } from './api-client';

export const STALE_SECONDS = 3;

export type displayState = 'ok' | 'above_max' | 'below_min' | 'no_data';

export const CRITICAL_SENSORS = ['BATTERY_TEMPERATURE', 'MOTOR_TEMPERATURE', 'PACK_VOLTAGE', 'PACK_SOC'];
export const DRIVING_SENSORS = ['VEHICLE_SPEED', 'STEERING_ANGLE', 'BRAKE_PRESSURE_FRONT', 'PACK_CURRENT'];
export const TYRE_SENSORS = ['TYRE_PRESSURE_FL', 'TYRE_PRESSURE_FR', 'TYRE_PRESSURE_RL', 'TYRE_PRESSURE_RR'];

const GROUPS = [
  { title: 'CRITICAL · BATTERY & MOTOR', names: CRITICAL_SENSORS },
  { title: 'DRIVING', names: DRIVING_SENSORS },
  { title: 'TYRES', names: TYRE_SENSORS },
];

const LABELS = new Map<string, string>([
  ['BATTERY_TEMPERATURE', 'Battery temp'],
  ['MOTOR_TEMPERATURE', 'Motor temp'],
  ['PACK_VOLTAGE', 'Pack voltage'],
  ['PACK_SOC', 'Pack SOC'],
  ['VEHICLE_SPEED', 'Vehicle speed'],
  ['STEERING_ANGLE', 'Steering angle'],
  ['BRAKE_PRESSURE_FRONT', 'Brake pressure front'],
  ['PACK_CURRENT', 'Pack current'],
  ['TYRE_PRESSURE_FL', 'Tyre FL'],
  ['TYRE_PRESSURE_FR', 'Tyre FR'],
  ['TYRE_PRESSURE_RL', 'Tyre RL'],
  ['TYRE_PRESSURE_RR', 'Tyre RR'],
]);

export interface sensorView {
  sensor: SensorMetadata;
  reading: TelemetryReading | undefined;
  state: displayState;
  age: number | null;
  noData: boolean;
  outOfRange: boolean;
  alarm: boolean;
  lastKnownAlarm: boolean;
}

export interface sensorGroup {
  title: string;
  sensors: SensorMetadata[];
}

export interface dashboardSummary {
  alarms: number;
  lastKnownAlarms: number;
  outOfRange: number;
  noData: number;
  allNoData: boolean;
  freshestAge: number | null;
}

export type attentionKind = 'alarm' | 'out_of_range' | 'all_no_data' | 'last_known_alarm' | 'no_data';

export interface attentionItem {
  key: string;
  kind: attentionKind;
  title: string;
  detail: string;
  age: number | null;
  state: displayState;
}

export function getLabel(sensorName: string) {
  const label = LABELS.get(sensorName);
  if (label) {
    return label;
  }
  return sensorName;
}

export function getAge(reading: TelemetryReading | undefined, now: number) {
  if (!reading) {
    return null;
  }
  return now - reading.timestamp;
}

export function getDisplayState(sensor: SensorMetadata, reading: TelemetryReading | undefined, now: number): displayState {
  const age = getAge(reading, now);
  if (!reading || age === null || age >= STALE_SECONDS) {
    return 'no_data';
  }
  if (reading.status === 'unknown') {
    return 'no_data';
  }
  if (reading.status === 'ok') {
    return 'ok';
  }
  if (sensor.max !== null && reading.value > sensor.max) {
    return 'above_max';
  }
  return 'below_min';
}

export function getSensorView(sensor: SensorMetadata, reading: TelemetryReading | undefined, now: number): sensorView {
  const state = getDisplayState(sensor, reading, now);
  const noData = state === 'no_data';
  const alarmOn = reading !== undefined && reading.alarm;
  return {
    sensor: sensor,
    reading: reading,
    state: state,
    age: getAge(reading, now),
    noData: noData,
    outOfRange: state === 'above_max' || state === 'below_min',
    alarm: alarmOn && !noData,
    lastKnownAlarm: alarmOn && noData,
  };
}

export function getTagText(state: displayState, age: number | null) {
  if (state === 'ok') {
    return 'OK';
  }
  if (state === 'above_max') {
    return 'ABOVE MAX';
  }
  if (state === 'below_min') {
    return 'BELOW MIN';
  }
  if (age !== null && age >= STALE_SECONDS) {
    return `NO DATA ${Math.floor(age)}s`;
  }
  return 'NO DATA';
}

export function formatValue(value: number) {
  return value.toFixed(1).replace('-', '−');
}

export function formatWhole(value: number) {
  return String(Math.round(value)).replace('-', '−');
}

export function formatUnit(unit: string) {
  if (unit === 'C') {
    return '°C';
  }
  return unit;
}

export function formatRange(sensor: SensorMetadata) {
  if (sensor.min === null || sensor.max === null) {
    return 'no range set';
  }
  return `${formatWhole(sensor.min)}–${formatWhole(sensor.max)} ${formatUnit(sensor.unit)}`;
}

export function getFraction(value: number, min: number, max: number) {
  if (max === min) {
    return 0;
  }
  let fraction = (value - min) / (max - min);
  if (fraction < 0) {
    fraction = 0;
  }
  if (fraction > 1) {
    fraction = 1;
  }
  return fraction;
}

export function groupSensors(sensors: SensorMetadata[]) {
  const byName = new Map<string, SensorMetadata>();
  for (const sensor of sensors) {
    byName.set(sensor.sensorName, sensor);
  }

  const groups: sensorGroup[] = [];
  const placed = new Set<string>();
  for (const group of GROUPS) {
    const members: SensorMetadata[] = [];
    for (const name of group.names) {
      const sensor = byName.get(name);
      if (sensor) {
        members.push(sensor);
        placed.add(name);
      }
    }
    groups.push({ title: group.title, sensors: members });
  }

  const others: SensorMetadata[] = [];
  for (const sensor of sensors) {
    if (!placed.has(sensor.sensorName)) {
      others.push(sensor);
    }
  }
  if (others.length > 0) {
    groups.push({ title: 'OTHER', sensors: others });
  }

  return groups;
}

export function summarise(views: sensorView[]) {
  const summary: dashboardSummary = {
    alarms: 0,
    lastKnownAlarms: 0,
    outOfRange: 0,
    noData: 0,
    allNoData: views.length > 0,
    freshestAge: null,
  };

  for (const view of views) {
    if (view.noData) {
      summary.noData += 1;
    } else {
      summary.allNoData = false;
    }
    if (view.alarm) {
      summary.alarms += 1;
    }
    if (view.lastKnownAlarm) {
      summary.lastKnownAlarms += 1;
    }
    if (view.outOfRange) {
      summary.outOfRange += 1;
    }
    if (view.age !== null && (summary.freshestAge === null || view.age < summary.freshestAge)) {
      summary.freshestAge = view.age;
    }
  }

  return summary;
}

function describeValue(view: sensorView) {
  if (!view.reading) {
    return '';
  }
  const valueText = `${formatValue(view.reading.value)} ${formatUnit(view.sensor.unit)}`;
  if (view.state === 'above_max' && view.sensor.max !== null) {
    return `${valueText}, max is ${formatWhole(view.sensor.max)}.`;
  }
  if (view.state === 'below_min' && view.sensor.min !== null) {
    return `${valueText}, min is ${formatWhole(view.sensor.min)}.`;
  }
  return `${valueText}.`;
}

export function getAttentionItems(views: sensorView[], unreachable: boolean) {
  const alarms: attentionItem[] = [];
  const outOfRange: attentionItem[] = [];
  const noData: attentionItem[] = [];
  const lastKnownNames: string[] = [];
  let allNoData = views.length > 0;

  for (const view of views) {
    const title = getLabel(view.sensor.sensorName);
    const key = String(view.sensor.sensorId);

    if (!view.noData) {
      allNoData = false;
    }
    if (view.lastKnownAlarm) {
      lastKnownNames.push(title);
    }

    if (view.alarm) {
      let detail = 'In range now. Alarm clears after 5s with no out-of-range readings.';
      if (view.outOfRange) {
        detail = describeValue(view);
      }
      alarms.push({ key: key, kind: 'alarm', title: title, detail: detail, age: view.age, state: view.state });
    } else if (view.outOfRange) {
      outOfRange.push({ key: key, kind: 'out_of_range', title: title, detail: describeValue(view), age: view.age, state: view.state });
    } else if (view.noData) {
      let detail = 'No reading received yet.';
      if (view.reading && view.age !== null) {
        detail = `Last reading ${Math.floor(view.age)}s ago. Link fine, check this sensor.`;
      }
      noData.push({ key: key, kind: 'no_data', title: title, detail: detail, age: view.age, state: view.state });
    }
  }

  const items: attentionItem[] = [];
  for (const item of alarms) {
    items.push(item);
  }
  for (const item of outOfRange) {
    items.push(item);
  }

  if (allNoData) {
    let detail = 'The API is answering, but no sensor has sent anything for 3s+. Check the car / emulator link.';
    if (unreachable) {
      detail = 'The API stopped answering. Values are frozen and greyed.';
    }
    items.push({ key: 'all', kind: 'all_no_data', title: `All ${views.length} sensors`, detail: detail, age: null, state: 'no_data' });
  } else {
    for (const item of noData) {
      items.push(item);
    }
  }

  if (lastKnownNames.length > 0) {
    items.push({
      key: 'last-known',
      kind: 'last_known_alarm',
      title: lastKnownNames.join(', '),
      detail: 'Alarm was on at the last reading. May have changed since.',
      age: null,
      state: 'no_data',
    });
  }

  return items;
}
