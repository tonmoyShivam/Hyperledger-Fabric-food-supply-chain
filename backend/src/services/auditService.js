'use strict';

const fabricService = require('./fabricService');
const batchService = require('./batchService');
const recallService = require('./recallService');

/**
 * Auditor-facing helpers that compose ledger queries.
 */
async function getIntegrityReport(mspId, batchId) {
  return batchService.verifyBatchIntegrity(mspId, batchId);
}

async function getFullAuditTrail(mspId, batchId) {
  const [history, integrity] = await Promise.all([
    batchService.getBatchHistory(mspId, batchId),
    batchService.verifyBatchIntegrity(mspId, batchId),
  ]);

  let recall = null;
  try {
    recall = await recallService.getRecallReport(mspId, batchId);
  } catch {
    recall = null;
  }

  return {
    batch: history?.batch || null,
    events: history?.events || [],
    integrity,
    recall,
  };
}

async function getDashboardStats(mspId) {
  return batchService.getDashboardStats(mspId);
}

async function getEventsByActor(mspId, actor) {
  return fabricService.evaluateTransaction(mspId, 'getEventsByActor', actor);
}

async function getEventsByStage(mspId, stage) {
  return fabricService.evaluateTransaction(mspId, 'getEventsByStage', stage);
}

module.exports = {
  getIntegrityReport,
  getFullAuditTrail,
  getDashboardStats,
  getEventsByActor,
  getEventsByStage,
};
