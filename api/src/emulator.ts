// talking to emulator: loads sensor metadata and keeps the WS connected

import WebSocket from 'ws';
import type { sensorMetadata } from './types';
import { metadata, latestData, readingCounts, apiState } from './state';
import { checkReading } from './validation';
import { SENSOR_RANGES, isOutOfRange, updateAlarm } from './ranges';

export const EMULATOR_URL = process.env.EMULATOR_URL || 'http://localhost:3001';
const WS_URL = process.env.WS_URL || 'ws://localhost:3001';
const METADATA_RETRY_MS = 2000;
const RECONNECT_MS = 2000;

export async function fetchMetadata() {
  try {
    const response = await fetch(`${EMULATOR_URL}/sensors`);
    if (!response.ok) {
      throw new Error(`Emulator status: ${response.status}.`);
    }

    const sensors = (await response.json()) as sensorMetadata[];
    for (const sensor of sensors) {
      metadata.set(sensor.sensorId, {sensorName: sensor.sensorName, unit: sensor.unit});
      if (!SENSOR_RANGES.has(sensor.sensorName)) {
        console.warn(`No range set for ${sensor.sensorName}, so it will not be checked for out of range values.`);
      }
    }
    console.log(`Sensor metadata has been loaded for ${metadata.size} sensors!`);
    apiState.metadataLoaded = true;

  } catch(err) {
    console.error(`Unable to load sensor metadata (${(err as Error).message}). Retrying in ${METADATA_RETRY_MS}ms.`);    setTimeout(fetchMetadata, METADATA_RETRY_MS);
  }
}

export function connectToEmulator() {
  const conn = new WebSocket(`${WS_URL}/ws/telemetry`);
  conn.on('open', () => {
    console.log('Connected to the emulator!');
  });

  conn.on('error', (err) => {
    console.error('WebSocket error:', (err as NodeJS.ErrnoException).code);
  });

  conn.on('close', () => {
    console.log(`Connection to emulator closed. Retrying in ${RECONNECT_MS}ms.`);
    setTimeout(connectToEmulator, RECONNECT_MS);
  });

  conn.on('message', (data) => {
    let reading;
    try {
      reading = JSON.parse(data.toString());
    } catch(err) {
      console.error('Skipping a message from emulator because it could not be read:', err);
      readingCounts.dropped += 1;
      return;
    }

    const result = checkReading(reading);
    readingCounts[result] += 1;
    if (result === 'dropped') {
      return;
    }

    const sensorId = Number(reading.sensorId);
    const value = Number(reading.value);
    const timestamp = Number(reading.timestamp);
    latestData.set(sensorId, {value: value, timestamp: timestamp});

    const info = metadata.get(sensorId);
    if (info) {
      updateAlarm(sensorId, info.sensorName, timestamp, isOutOfRange(info.sensorName, value));
    }
  });
}