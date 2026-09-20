'use strict';

/** Batch asset helpers (documentation / shared constants). */

const BATCH_STATUS = Object.freeze({
  SAFE: 'SAFE',
  CONTAMINATED: 'CONTAMINATED',
  RECALLED: 'RECALLED',
});

function createBatchRecord({
  batchId,
  product,
  originActor,
  originLocation,
  createdAt,
  latestHash,
}) {
  return {
    batchId,
    product,
    status: BATCH_STATUS.SAFE,
    originActor,
    originLocation,
    createdAt,
    updatedAt: createdAt,
    eventCount: 1,
    contaminationReason: null,
    contaminationTimestamp: null,
    latestHash,
  };
}

module.exports = { BATCH_STATUS, createBatchRecord };
