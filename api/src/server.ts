// HTTP side: express setup, the routes, and starting everything up

import http from 'http';
import express from 'express';
import cors from 'cors';
import type { sensorDetails, sensorReading } from './types';
import { metadata, latestData, alarmOn, apiState } from './state';
import { getStatus, SENSOR_RANGES } from './ranges';
import { EMULATOR_URL, fetchMetadata, connectToEmulator } from './emulator';

const app = express();
app.use(cors({origin: true, credentials: false}));
app.use(express.json());

app.get('/health', async (_req, res) => {
  try {
    const r = await fetch(`${EMULATOR_URL}/sensors`);
    if (r.ok) {
      return res.json({ status: 'ok', emulator: true });
    }
  } catch {}
  res.status(503).json({ status: 'unhealthy', emulator: false });
});

app.get('/sensors', (_req, res) => {
  if (!apiState.metadataLoaded) {
    return res.status(503).json({error: 'Metadata for the sensors has not loaded yet. Please try again in a moment.'});
  }

  const sensorList: sensorDetails[] = [];
  for (const [sensorId, info] of metadata) {
    const range = SENSOR_RANGES.get(info.sensorName);
    let min: number | null = null;
    let max: number | null = null;
    if (range) {
      min = range.min;
      max = range.max;
    }

    sensorList.push({
      sensorId: sensorId,
      sensorName: info.sensorName,
      unit: info.unit,
      min: min,
      max: max,
    });
  }

  res.json(sensorList);
});

app.get('/telemetry/latest', (_req, res) => {
  const readingList: sensorReading[] = [];
  for (const [sensorId, reading] of latestData) {
    readingList.push({
      sensorId: sensorId,
      value: reading.value,
      timestamp: reading.timestamp,
      status: getStatus(sensorId, reading.value),
      alarm: alarmOn.has(sensorId),
    });
  }

  res.json(readingList);
});

fetchMetadata();
connectToEmulator();

const server = http.createServer(app);

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(Number(PORT), HOST, () => {
  console.log(`API server listening on http://${HOST}:${PORT}`);
});