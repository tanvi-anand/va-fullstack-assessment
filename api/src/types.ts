// shared types and interfaces used across the API

export type unitType = "C" | "kPa" | "A" | "V" | "%" | "km/h" | "deg" | "bar";
export type rangeStatus = "ok" | "out_of_range" | "unknown";

export interface sensorMetadata {
  sensorId: number;
  sensorName: string;
  unit: unitType;
}

export interface sensorDetails {
  sensorId: number;
  sensorName: string;
  unit: unitType;
  min: number | null;
  max: number | null;
}

export interface sensorReading {
  sensorId: number;
  value: number;
  timestamp: number;
  status: rangeStatus;
  alarm: boolean;
}

export interface sensorRange {
  min: number;
  max: number;
}