// out of range detection: range table, 5 second window, and alarm on/off

import type { sensorRange } from './types';
import { metadata, alarmOn } from './state';

export const SENSOR_RANGES = new Map<string, sensorRange>([
  ["BATTERY_TEMPERATURE",  {min: 20, max: 80}],
  ["MOTOR_TEMPERATURE",    {min: 30, max: 120}],
  ["TYRE_PRESSURE_FL",     {min: 150, max: 250}],
  ["TYRE_PRESSURE_FR",     {min: 150, max: 250}],
  ["TYRE_PRESSURE_RL",     {min: 150, max: 250}],
  ["TYRE_PRESSURE_RR",     {min: 150, max: 250}],
  ["PACK_CURRENT",         {min: -300, max: 300}],
  ["PACK_VOLTAGE",         {min: 350, max: 500}],
  ["PACK_SOC",             {min: 0, max: 100}],
  ["VEHICLE_SPEED",        {min: 0, max: 250}],
  ["STEERING_ANGLE",       {min: -180, max: 180}],
  ["BRAKE_PRESSURE_FRONT", {min: 0, max: 120}],
]);

const WINDOW_SECONDS = 5;
const OUT_OF_RANGE_LIMIT = 3;
const outOfRangeTimes = new Map<number, number[]>();

export function isOutOfRange(sensorName: string, value: number) {
  const range = SENSOR_RANGES.get(sensorName);
  if (!range) {
    return false;
  }

  return value < range.min || value > range.max;
}

export function updateAlarm(sensorId: number, sensorName: string, timestamp: number, outOfRange: boolean) {
  let times = outOfRangeTimes.get(sensorId);
  if (!times) {
    times = [];
    outOfRangeTimes.set(sensorId, times);
  }

  if (outOfRange) {
    times.push(timestamp);
  }

  while (times.length > 0 && times[0] < timestamp - WINDOW_SECONDS) {
    times.shift();
  }

  if (!alarmOn.has(sensorId) && times.length > OUT_OF_RANGE_LIMIT) {
    alarmOn.add(sensorId);
    const time = new Date(timestamp * 1000).toISOString();
    console.warn(`[${time}] OUT OF RANGE: ${sensorName} (${sensorId}) was out of range ${times.length} times in the last ${WINDOW_SECONDS}s. Alarm stays on until ${WINDOW_SECONDS}s pass with no out-of-range readings.`);
  }

  if (alarmOn.has(sensorId) && times.length === 0) {
    alarmOn.delete(sensorId);
    const time = new Date(timestamp * 1000).toISOString();
    console.log(`[${time}] BACK IN RANGE: ${sensorName} (${sensorId}) had no out-of-range readings for ${WINDOW_SECONDS}s.`);
  }
}

export function getStatus(sensorId: number, value: number) {
  const info = metadata.get(sensorId);
  if (!info) {
    return "unknown";
  }

  if (!SENSOR_RANGES.has(info.sensorName)) {
    return "unknown";
  }

  if (isOutOfRange(info.sensorName, value)) {
    return "out_of_range";
  }

  return "ok";
}