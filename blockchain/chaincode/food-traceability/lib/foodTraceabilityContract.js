'use strict';

const { Contract } = require('fabric-contract-api');
const crypto = require('crypto');

const GENESIS_PREV_HASH = '0'.repeat(64);
const BATCH_PREFIX = 'BATCH_';
const EVENTS_PREFIX = 'EVENTS_';
const RECALL_PREFIX = 'RECALL_';
const RECALL_INDEX = 'RECALL_INDEX';
const BATCH_INDEX = 'BATCH_INDEX';

const STAGES = Object.freeze({
  ORIGIN: 'ORIGIN',
  PROCESSOR: 'PROCESSOR',
  DISTRIBUTOR: 'DISTRIBUTOR',
  WALMART_STORE: 'WALMART_STORE',
  CUSTOMER_SALE: 'CUSTOMER_SALE',
  STATUS_CHANGE: 'STATUS_CHANGE',
});

const STATUS = Object.freeze({
  SAFE: 'SAFE',
  CONTAMINATED: 'CONTAMINATED',
  RECALLED: 'RECALLED',
});

/** MSP ID → application role */
const MSP_ROLE = Object.freeze({
  FarmOrgMSP: 'FARM',
  ProcessorOrgMSP: 'PROCESSOR',
  DistributorOrgMSP: 'DISTRIBUTOR',
  RetailOrgMSP: 'STORE_ADMIN',
  AuditorOrgMSP: 'AUDITOR',
});

/** Which stages each role may append */
const ROLE_STAGES = Object.freeze({
  FARM: [STAGES.ORIGIN],
  PROCESSOR: [STAGES.PROCESSOR],
  DISTRIBUTOR: [STAGES.DISTRIBUTOR],
  STORE_ADMIN: [STAGES.WALMART_STORE, STAGES.CUSTOMER_SALE, STAGES.STATUS_CHANGE],
  AUDITOR: [],
});

function serializeDetails(value) {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => serializeDetails(item)).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${serializeDetails(value[k])}`).join(',')}}`;
}

function buildEventPayload(event) {
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

function hashEvent(event) {
  return crypto.createHash('sha256').update(buildEventPayload(event)).digest('hex');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

class FoodTraceabilityContract extends Contract {
  constructor() {
    super('FoodTraceabilityContract');
  }

  async InitLedger(ctx) {
    await ctx.stub.putState(BATCH_INDEX, Buffer.from(JSON.stringify([])));
    await ctx.stub.putState(RECALL_INDEX, Buffer.from(JSON.stringify([])));
    return JSON.stringify({ success: true, message: 'Ledger initialized' });
  }

  _getRole(ctx) {
    const mspId = ctx.clientIdentity.getMSPID();
    const role = MSP_ROLE[mspId];
    assert(role, `Unknown MSP identity: ${mspId}`);
    return { mspId, role };
  }

  _requireRole(ctx, allowedRoles) {
    const identity = this._getRole(ctx);
    assert(
      allowedRoles.includes(identity.role),
      `Unauthorized: role ${identity.role} (${identity.mspId}) cannot perform this operation`
    );
    return identity;
  }

  _requireStagePermission(ctx, stage) {
    const identity = this._getRole(ctx);
    const allowed = ROLE_STAGES[identity.role] || [];
    assert(
      allowed.includes(stage),
      `Unauthorized: ${identity.role} cannot submit stage ${stage}`
    );
    return identity;
  }

  async _getBatchOrNull(ctx, batchId) {
    const data = await ctx.stub.getState(BATCH_PREFIX + batchId);
    if (!data || data.length === 0) return null;
    return JSON.parse(data.toString());
  }

  async _putBatch(ctx, batch) {
    await ctx.stub.putState(BATCH_PREFIX + batch.batchId, Buffer.from(JSON.stringify(batch)));
  }

  async _getEvents(ctx, batchId) {
    const data = await ctx.stub.getState(EVENTS_PREFIX + batchId);
    if (!data || data.length === 0) return [];
    return JSON.parse(data.toString());
  }

  async _putEvents(ctx, batchId, events) {
    await ctx.stub.putState(EVENTS_PREFIX + batchId, Buffer.from(JSON.stringify(events)));
  }

  async _addToIndex(ctx, indexKey, id) {
    const raw = await ctx.stub.getState(indexKey);
    const list = raw && raw.length ? JSON.parse(raw.toString()) : [];
    if (!list.includes(id)) {
      list.push(id);
      await ctx.stub.putState(indexKey, Buffer.from(JSON.stringify(list)));
    }
  }

  async _getIndex(ctx, indexKey) {
    const raw = await ctx.stub.getState(indexKey);
    return raw && raw.length ? JSON.parse(raw.toString()) : [];
  }

  /**
   * Register a new food batch with ORIGIN event.
   * FarmOrg only.
   */
  async registerBatch(ctx, batchId, product, originActor, originLocation, detailsJson) {
    const identity = this._requireRole(ctx, ['FARM']);
    assert(batchId && String(batchId).trim(), 'batchId is required');
    assert(product && String(product).trim(), 'product is required');
    assert(originActor && String(originActor).trim(), 'originActor is required');
    assert(originLocation && String(originLocation).trim(), 'originLocation is required');

    batchId = String(batchId).trim().toUpperCase();
    const existing = await this._getBatchOrNull(ctx, batchId);
    assert(!existing, `Batch ${batchId} already exists`);

    let details = {};
    if (detailsJson) {
      try {
        details = typeof detailsJson === 'string' ? JSON.parse(detailsJson) : detailsJson;
      } catch {
        details = { notes: String(detailsJson) };
      }
    }

    const txId = ctx.stub.getTxID();
    const timestamp = this._txTimestamp(ctx);

    const eventBase = {
      eventId: `${batchId}-0`,
      batchId,
      index: 0,
      stage: STAGES.ORIGIN,
      actor: String(originActor).trim(),
      actorOrg: identity.mspId,
      location: String(originLocation).trim(),
      timestamp,
      details: { ...details, product: String(product).trim(), notes: details.notes || 'Batch registered at origin' },
      previousHash: GENESIS_PREV_HASH,
      transactionId: txId,
    };
    const hash = hashEvent(eventBase);
    const originEvent = { ...eventBase, hash };

    const batch = {
      batchId,
      product: String(product).trim(),
      status: STATUS.SAFE,
      originActor: originEvent.actor,
      originLocation: originEvent.location,
      createdAt: timestamp,
      updatedAt: timestamp,
      eventCount: 1,
      contaminationReason: null,
      contaminationTimestamp: null,
      latestHash: hash,
    };

    await this._putBatch(ctx, batch);
    await this._putEvents(ctx, batchId, [originEvent]);
    await this._addToIndex(ctx, BATCH_INDEX, batchId);

    return JSON.stringify({
      success: true,
      batchId,
      transactionId: txId,
      blockIndex: 0,
      hash,
      event: originEvent,
      batch,
    });
  }

  async batchExists(ctx, batchId) {
    batchId = String(batchId).trim().toUpperCase();
    const batch = await this._getBatchOrNull(ctx, batchId);
    return JSON.stringify({ exists: Boolean(batch) });
  }

  async getBatch(ctx, batchId) {
    this._requireRole(ctx, ['FARM', 'PROCESSOR', 'DISTRIBUTOR', 'STORE_ADMIN', 'AUDITOR']);
    batchId = String(batchId).trim().toUpperCase();
    const batch = await this._getBatchOrNull(ctx, batchId);
    assert(batch, `Batch ${batchId} not found`);
    return JSON.stringify(batch);
  }

  async getAllBatches(ctx) {
    this._requireRole(ctx, ['FARM', 'PROCESSOR', 'DISTRIBUTOR', 'STORE_ADMIN', 'AUDITOR']);
    const ids = await this._getIndex(ctx, BATCH_INDEX);
    const batches = [];
    for (const id of ids) {
      const batch = await this._getBatchOrNull(ctx, id);
      if (batch) batches.push(batch);
    }
    batches.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    return JSON.stringify(batches);
  }

  async getBatchesByStatus(ctx, status) {
    this._requireRole(ctx, ['FARM', 'PROCESSOR', 'DISTRIBUTOR', 'STORE_ADMIN', 'AUDITOR']);
    const all = JSON.parse(await this.getAllBatches(ctx));
    return JSON.stringify(all.filter((b) => b.status === status));
  }

  /**
   * Append a supply-chain event. Stage must match submitting org role.
   */
  async addSupplyChainEvent(ctx, batchId, stage, actor, location, detailsJson) {
    batchId = String(batchId).trim().toUpperCase();
    stage = String(stage).trim().toUpperCase();
    assert(Object.values(STAGES).includes(stage), `Invalid stage: ${stage}`);
    assert(stage !== STAGES.ORIGIN, 'ORIGIN stage is only created via registerBatch');
    assert(stage !== STAGES.STATUS_CHANGE, 'Use flagContamination for status changes');

    const identity = this._requireStagePermission(ctx, stage);
    assert(actor && String(actor).trim(), 'actor is required');
    assert(location && String(location).trim(), 'location is required');

    const batch = await this._getBatchOrNull(ctx, batchId);
    assert(batch, `Batch ${batchId} not found`);

    let details = {};
    if (detailsJson) {
      try {
        details = typeof detailsJson === 'string' ? JSON.parse(detailsJson) : detailsJson;
      } catch {
        details = { notes: String(detailsJson) };
      }
    }

    const events = await this._getEvents(ctx, batchId);
    const previous = events[events.length - 1];
    const index = events.length;
    const txId = ctx.stub.getTxID();
    const timestamp = this._txTimestamp(ctx);

    const eventBase = {
      eventId: `${batchId}-${index}`,
      batchId,
      index,
      stage,
      actor: String(actor).trim(),
      actorOrg: identity.mspId,
      location: String(location).trim(),
      timestamp,
      details: { notes: details.notes || details.note || 'Event recorded', ...details },
      previousHash: previous.hash,
      transactionId: txId,
    };
    const hash = hashEvent(eventBase);
    const event = { ...eventBase, hash };

    events.push(event);
    batch.eventCount = events.length;
    batch.updatedAt = timestamp;
    batch.latestHash = hash;

    await this._putEvents(ctx, batchId, events);
    await this._putBatch(ctx, batch);

    return JSON.stringify({
      success: true,
      eventId: event.eventId,
      transactionId: txId,
      blockIndex: index,
      hash,
      event,
      batch,
    });
  }

  async getBatchHistory(ctx, batchId) {
    this._requireRole(ctx, ['FARM', 'PROCESSOR', 'DISTRIBUTOR', 'STORE_ADMIN', 'AUDITOR']);
    batchId = String(batchId).trim().toUpperCase();
    const batch = await this._getBatchOrNull(ctx, batchId);
    assert(batch, `Batch ${batchId} not found`);
    const events = await this._getEvents(ctx, batchId);
    return JSON.stringify({ batch, events });
  }

  async getEventsByActor(ctx, actor) {
    this._requireRole(ctx, ['FARM', 'PROCESSOR', 'DISTRIBUTOR', 'STORE_ADMIN', 'AUDITOR']);
    const ids = await this._getIndex(ctx, BATCH_INDEX);
    const matches = [];
    for (const id of ids) {
      const events = await this._getEvents(ctx, id);
      for (const e of events) {
        if (String(e.actor).toLowerCase().includes(String(actor).toLowerCase())) {
          matches.push(e);
        }
      }
    }
    return JSON.stringify(matches);
  }

  async getEventsByStage(ctx, stage) {
    this._requireRole(ctx, ['FARM', 'PROCESSOR', 'DISTRIBUTOR', 'STORE_ADMIN', 'AUDITOR']);
    stage = String(stage).trim().toUpperCase();
    const ids = await this._getIndex(ctx, BATCH_INDEX);
    const matches = [];
    for (const id of ids) {
      const events = await this._getEvents(ctx, id);
      for (const e of events) {
        if (e.stage === stage) matches.push(e);
      }
    }
    return JSON.stringify(matches);
  }

  /**
   * Recalculate every event hash and validate previousHash links.
   */
  async verifyBatchIntegrity(ctx, batchId) {
    this._requireRole(ctx, ['FARM', 'PROCESSOR', 'DISTRIBUTOR', 'STORE_ADMIN', 'AUDITOR']);
    batchId = String(batchId).trim().toUpperCase();
    const batch = await this._getBatchOrNull(ctx, batchId);
    assert(batch, `Batch ${batchId} not found`);
    const events = await this._getEvents(ctx, batchId);

    const invalidBlocks = [];
    let validBlocks = 0;
    let brokenLinks = 0;

    for (let i = 0; i < events.length; i += 1) {
      const event = events[i];
      const reasons = [];

      if (event.index !== i) {
        reasons.push(`Index mismatch: expected ${i}, found ${event.index}`);
      }
      if (event.batchId !== batchId) {
        reasons.push(`Batch ID mismatch: ${event.batchId}`);
      }

      const expectedPrev = i === 0 ? GENESIS_PREV_HASH : events[i - 1].hash;
      if (event.previousHash !== expectedPrev) {
        brokenLinks += 1;
        reasons.push('Broken previousHash link');
      }

      const recalculated = hashEvent({
        index: event.index,
        batchId: event.batchId,
        stage: event.stage,
        actor: event.actor,
        actorOrg: event.actorOrg,
        location: event.location,
        timestamp: event.timestamp,
        details: event.details,
        previousHash: event.previousHash,
      });

      if (recalculated !== event.hash) {
        reasons.push('Hash mismatch');
      }

      if (reasons.length) {
        invalidBlocks.push({
          index: i,
          eventId: event.eventId,
          reason: reasons.join('; '),
          expectedHash: recalculated,
          storedHash: event.hash,
          expectedPreviousHash: expectedPrev,
          storedPreviousHash: event.previousHash,
          transactionId: event.transactionId,
        });
      } else {
        validBlocks += 1;
      }
    }

    return JSON.stringify({
      valid: invalidBlocks.length === 0,
      batchId,
      blocksChecked: events.length,
      validBlocks,
      invalidBlocks: invalidBlocks.length,
      brokenLinks,
      failures: invalidBlocks,
      verifiedAt: this._txTimestamp(ctx),
      transactionIds: events.map((e) => e.transactionId),
    });
  }

  /**
   * Flag contamination — RetailOrg (STORE_ADMIN) only.
   */
  async flagContamination(ctx, batchId, reason, notes) {
    const identity = this._requireRole(ctx, ['STORE_ADMIN']);
    batchId = String(batchId).trim().toUpperCase();
    assert(reason && String(reason).trim(), 'contamination reason is required');

    const batch = await this._getBatchOrNull(ctx, batchId);
    assert(batch, `Batch ${batchId} not found`);
    assert(batch.status !== STATUS.CONTAMINATED, `Batch ${batchId} is already contaminated`);

    const events = await this._getEvents(ctx, batchId);
    const previous = events[events.length - 1];
    const index = events.length;
    const txId = ctx.stub.getTxID();
    const timestamp = this._txTimestamp(ctx);

    const eventBase = {
      eventId: `${batchId}-${index}`,
      batchId,
      index,
      stage: STAGES.STATUS_CHANGE,
      actor: identity.mspId.replace('MSP', '') + ' Quality Assurance',
      actorOrg: identity.mspId,
      location: previous.location || 'Inspection Facility',
      timestamp,
      details: {
        previousStatus: batch.status,
        newStatus: STATUS.CONTAMINATED,
        reason: String(reason).trim(),
        notes: notes ? String(notes).trim() : 'Contamination reported',
      },
      previousHash: previous.hash,
      transactionId: txId,
    };
    const hash = hashEvent(eventBase);
    const event = { ...eventBase, hash };
    events.push(event);

    batch.status = STATUS.CONTAMINATED;
    batch.contaminationReason = String(reason).trim();
    batch.contaminationTimestamp = timestamp;
    batch.eventCount = events.length;
    batch.updatedAt = timestamp;
    batch.latestHash = hash;

    await this._putEvents(ctx, batchId, events);
    await this._putBatch(ctx, batch);

    const recall = await this._buildRecall(ctx, batch, events, reason, txId, timestamp);
    await ctx.stub.putState(RECALL_PREFIX + recall.recallId, Buffer.from(JSON.stringify(recall)));
    await this._addToIndex(ctx, RECALL_INDEX, recall.recallId);

    return JSON.stringify({
      success: true,
      batch,
      event,
      recall,
      transactionId: txId,
      hash,
    });
  }

  async generateRecallReport(ctx, batchId) {
    this._requireRole(ctx, ['STORE_ADMIN', 'AUDITOR']);
    batchId = String(batchId).trim().toUpperCase();
    const batch = await this._getBatchOrNull(ctx, batchId);
    assert(batch, `Batch ${batchId} not found`);
    const events = await this._getEvents(ctx, batchId);

    // Return existing recall if present
    const recallIds = await this._getIndex(ctx, RECALL_INDEX);
    for (const id of recallIds) {
      const raw = await ctx.stub.getState(RECALL_PREFIX + id);
      if (!raw || !raw.length) continue;
      const recall = JSON.parse(raw.toString());
      if (recall.batchId === batchId) {
        return JSON.stringify(recall);
      }
    }

    assert(
      batch.status === STATUS.CONTAMINATED || batch.status === STATUS.RECALLED,
      'Batch is not contaminated; flag contamination first'
    );

    const txId = ctx.stub.getTxID();
    const timestamp = this._txTimestamp(ctx);
    const recall = await this._buildRecall(
      ctx,
      batch,
      events,
      batch.contaminationReason || 'Contamination',
      txId,
      timestamp
    );
    await ctx.stub.putState(RECALL_PREFIX + recall.recallId, Buffer.from(JSON.stringify(recall)));
    await this._addToIndex(ctx, RECALL_INDEX, recall.recallId);
    return JSON.stringify(recall);
  }

  async getRecallReport(ctx, batchId) {
    this._requireRole(ctx, ['FARM', 'PROCESSOR', 'DISTRIBUTOR', 'STORE_ADMIN', 'AUDITOR']);
    batchId = String(batchId).trim().toUpperCase();
    const recallIds = await this._getIndex(ctx, RECALL_INDEX);
    for (const id of recallIds) {
      const raw = await ctx.stub.getState(RECALL_PREFIX + id);
      if (!raw || !raw.length) continue;
      const recall = JSON.parse(raw.toString());
      if (recall.batchId === batchId) return JSON.stringify(recall);
    }
    throw new Error(`No recall found for batch ${batchId}`);
  }

  async getAllRecalls(ctx) {
    this._requireRole(ctx, ['FARM', 'PROCESSOR', 'DISTRIBUTOR', 'STORE_ADMIN', 'AUDITOR']);
    const recallIds = await this._getIndex(ctx, RECALL_INDEX);
    const recalls = [];
    for (const id of recallIds) {
      const raw = await ctx.stub.getState(RECALL_PREFIX + id);
      if (raw && raw.length) recalls.push(JSON.parse(raw.toString()));
    }
    recalls.sort((a, b) => String(b.generatedAt).localeCompare(String(a.generatedAt)));
    return JSON.stringify(recalls);
  }

  async getDashboardStats(ctx) {
    this._requireRole(ctx, ['FARM', 'PROCESSOR', 'DISTRIBUTOR', 'STORE_ADMIN', 'AUDITOR']);
    const batches = JSON.parse(await this.getAllBatches(ctx));
    let totalEvents = 0;
    for (const b of batches) totalEvents += b.eventCount || 0;
    const recalls = JSON.parse(await this.getAllRecalls(ctx));
    return JSON.stringify({
      totalBatches: batches.length,
      safeBatches: batches.filter((b) => b.status === STATUS.SAFE).length,
      contaminatedBatches: batches.filter((b) => b.status === STATUS.CONTAMINATED).length,
      recalledBatches: batches.filter((b) => b.status === STATUS.RECALLED).length,
      totalEvents,
      totalRecalls: recalls.length,
    });
  }

  /** Public read for customer QR verification — still requires a network identity (backend uses service account). */
  async getPublicBatchView(ctx, batchId) {
    batchId = String(batchId).trim().toUpperCase();
    const batch = await this._getBatchOrNull(ctx, batchId);
    assert(batch, `Batch ${batchId} not found`);
    const events = await this._getEvents(ctx, batchId);
    const integrity = JSON.parse(await this.verifyBatchIntegrity(ctx, batchId));

    const journey = events
      .filter((e) => e.stage !== STAGES.STATUS_CHANGE)
      .map((e) => ({
        stage: e.stage,
        actor: e.actor,
        location: e.location,
        timestamp: e.timestamp,
        index: e.index,
        hash: e.hash,
      }));

    return JSON.stringify({
      batchId: batch.batchId,
      product: batch.product,
      status: batch.status,
      originActor: batch.originActor,
      originLocation: batch.originLocation,
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
      eventCount: batch.eventCount,
      journey,
      verification: {
        valid: integrity.valid,
        blocksChecked: integrity.blocksChecked,
        verifiedAt: integrity.verifiedAt,
      },
    });
  }

  async _buildRecall(ctx, batch, events, reason, txId, timestamp) {
    const origin = events.find((e) => e.stage === STAGES.ORIGIN);
    const processors = events
      .filter((e) => e.stage === STAGES.PROCESSOR)
      .map((e) => ({ actor: e.actor, location: e.location, timestamp: e.timestamp, org: e.actorOrg }));
    const distributors = events
      .filter((e) => e.stage === STAGES.DISTRIBUTOR)
      .map((e) => ({ actor: e.actor, location: e.location, timestamp: e.timestamp, org: e.actorOrg }));
    const stores = events
      .filter((e) => e.stage === STAGES.WALMART_STORE)
      .map((e) => ({ actor: e.actor, location: e.location, timestamp: e.timestamp, org: e.actorOrg }));
    const sales = events.filter((e) => e.stage === STAGES.CUSTOMER_SALE);

    const year = new Date(timestamp).getFullYear() || new Date().getFullYear();
    const recallId = `REC-${year}-${batch.batchId}`;

    const pathActors = [];
    const seen = new Set();
    for (const e of events) {
      if (e.stage === STAGES.STATUS_CHANGE) continue;
      const key = `${e.stage}|${e.actor}|${e.location}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pathActors.push({ stage: e.stage, actor: e.actor, location: e.location, org: e.actorOrg });
    }

    return {
      recallId,
      batchId: batch.batchId,
      product: batch.product,
      reason: String(reason).trim(),
      origin: origin
        ? { actor: origin.actor, location: origin.location, timestamp: origin.timestamp, org: origin.actorOrg }
        : null,
      processors,
      distributors,
      stores,
      customerSaleStatus: {
        sold: sales.length > 0,
        count: sales.length,
        events: sales.map((e) => ({
          actor: e.actor,
          location: e.location,
          timestamp: e.timestamp,
        })),
      },
      pathActors,
      timeline: events.map((e) => ({
        index: e.index,
        stage: e.stage,
        actor: e.actor,
        location: e.location,
        timestamp: e.timestamp,
        hash: e.hash,
        transactionId: e.transactionId,
      })),
      generatedAt: timestamp,
      transactionId: txId,
    };
  }

  _txTimestamp(ctx) {
    const ts = ctx.stub.getTxTimestamp();
    const millis = (ts.seconds.low || ts.seconds) * 1000 + Math.floor((ts.nanos || 0) / 1e6);
    return new Date(millis).toISOString();
  }
}

// Export helpers for unit tests
FoodTraceabilityContract.hashEvent = hashEvent;
FoodTraceabilityContract.serializeDetails = serializeDetails;
FoodTraceabilityContract.GENESIS_PREV_HASH = GENESIS_PREV_HASH;
FoodTraceabilityContract.MSP_ROLE = MSP_ROLE;
FoodTraceabilityContract.ROLE_STAGES = ROLE_STAGES;

module.exports = FoodTraceabilityContract;
