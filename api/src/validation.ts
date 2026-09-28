// invalid data handling: accepts, recovers, or drops each reading

import { metadata, apiState } from './state';

const ALLOWED_FIELDS = ['sensorId', 'value', 'timestamp'];

function checkField(field: unknown) {
  if (typeof field === 'number' && Number.isFinite(field)) {
    return 'accepted';
  }

  if (typeof field === 'string' && field.trim() !== '' && Number.isFinite(Number(field))) {
    return 'recovered';
  }

  return 'dropped';
}

export function checkReading(reading: any) {
  if (typeof reading !== 'object' || reading === null) {
    return 'dropped';
  }

  const idResult = checkField(reading.sensorId);
  const valueResult = checkField(reading.value);
  const timestampResult = checkField(reading.timestamp);

  if (idResult === 'dropped' || valueResult === 'dropped' || timestampResult === 'dropped') {
    return 'dropped';
  }

  if (apiState.metadataLoaded && !metadata.has(Number(reading.sensorId))) {
    return 'dropped';
  }

  if (idResult === 'recovered' || valueResult === 'recovered' || timestampResult === 'recovered') {
    return 'recovered';
  }

  for (const key of Object.keys(reading)) {
    if (!ALLOWED_FIELDS.includes(key)) {
      return 'recovered';
    }
  }

  return 'accepted';
}