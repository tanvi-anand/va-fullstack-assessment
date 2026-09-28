// data that more than one file reads or changes (metadata, latest readings, counts, alarms)

import type { unitType } from './types';

export const metadata = new Map<number, {sensorName: string, unit: unitType}>();
export const latestData = new Map<number, {value: number, timestamp: number}>();
export const readingCounts = {accepted: 0, recovered: 0, dropped: 0};
export const alarmOn = new Set<number>();
export const apiState = {metadataLoaded: false};