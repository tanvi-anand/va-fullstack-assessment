/**
 * API client for the Vehicle Analytics backend.
 * The backend API surface is designed by you in the fullstack assessment (va-fullstack-assessment).
 * The only guaranteed endpoint is GET /health. You must add functions that call your
 * metadata and data routes (paths and response shapes are up to your API design).
 */

export type rangeStatus = 'ok' | 'out_of_range' | 'unknown';

export interface SensorMetadata {
  sensorId: number;
  sensorName: string;
  unit: string;
  min: number |null,
  max: number | null,
}

export interface TelemetryReading {
  sensorId: number;
  value: number;
  timestamp: number;
  status: rangeStatus;
  alarm: boolean;
}

export interface HealthResponse {
  status: string;
  emulator?: boolean;
  reason?: string;
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export async function fetchHealth(timeoutMs = 3000): Promise<HealthResponse> {
  const url = `${API_BASE_URL}/health`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { mode: 'cors', signal: controller.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.reason ?? `Health: ${res.status} ${res.statusText}`);
    }
    return data as HealthResponse;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('Health check timed out');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Add your own functions here to call the metadata and data endpoints you
// designed in the API section (e.g. fetchSensors(), fetchLatestTelemetry(),
// or whatever paths and response shapes you defined). Use the types above
// or define new ones to match your API.
// ---------------------------------------------------------------------------

export async function fetchSensors(): Promise<SensorMetadata[] | null> {
  const response = await fetch(`${API_BASE_URL}/sensors`);
  if (response.status === 503) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Sensors: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as SensorMetadata[];
}

export async function fetchLatestTelemetry(): Promise<TelemetryReading[]> {
  const response = await fetch(`${API_BASE_URL}/telemetry/latest`);
  if (!response.ok) {
    throw new Error(`Telemetry: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as TelemetryReading[];
}