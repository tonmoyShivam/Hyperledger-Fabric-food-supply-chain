const GENESIS_PREV_HASH = '0'.repeat(64);

export function serializeDetails(value) {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => serializeDetails(item)).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${serializeDetails(value[k])}`).join(',')}}`;
}

export function buildEventPayload(event) {
  return (
    String(event.index) +
    String(event.batchId) +
    String(event.stage) +
    String(event.actor) +
    String(event.actorOrg) +
    String(event.location) +
    String(event.timestamp) +
    serializeDetails(event.details) +
    String(event.previousHash)
  );
}

export async function sha256Hex(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashEvent(event) {
  return sha256Hex(buildEventPayload(event));
}

/**
 * In-memory integrity demo: clone events, tamper one field, compare
 * original stored hash vs recalculated hash. Does NOT modify Fabric.
 */
export async function demonstrateTamper(events, eventIndex, field, newValue) {
  if (!Array.isArray(events) || events.length === 0) {
    throw new Error('No events available for integrity demonstration');
  }

  const clone = structuredClone(events);
  const target = clone[eventIndex];
  if (!target) {
    throw new Error(`Event index ${eventIndex} not found`);
  }

  const originalHash = target.hash;
  const previousValue = target[field];

  if (field === 'details') {
    target.details = typeof newValue === 'object' ? newValue : { notes: String(newValue) };
  } else {
    target[field] = newValue;
  }

  const recalculatedHash = await hashEvent({
    index: target.index,
    batchId: target.batchId,
    stage: target.stage,
    actor: target.actor,
    actorOrg: target.actorOrg,
    location: target.location,
    timestamp: target.timestamp,
    details: target.details,
    previousHash: target.previousHash,
  });

  return {
    eventIndex,
    field,
    previousValue,
    newValue,
    originalHash,
    recalculatedHash,
    mismatch: originalHash !== recalculatedHash,
    note: 'This demonstration clones history in browser memory only. Hyperledger Fabric ledger state was not modified.',
  };
}

export { GENESIS_PREV_HASH };
