'use strict';

const fabricService = require('./fabricService');

function detailsToJson(details) {
  if (details === undefined || details === null) return '';
  if (typeof details === 'string') return details;
  return JSON.stringify(details);
}

async function registerBatch(mspId, { batchId, product, originActor, originLocation, details }) {
  const { result, transactionId } = await fabricService.submitTransaction(
    mspId,
    'registerBatch',
    batchId,
    product,
    originActor,
    originLocation,
    detailsToJson(details)
  );
  return { ...result, transactionId: result?.transactionId || transactionId };
}

async function getBatch(mspId, batchId) {
  return fabricService.evaluateTransaction(mspId, 'getBatch', batchId);
}

async function getAllBatches(mspId) {
  return fabricService.evaluateTransaction(mspId, 'getAllBatches');
}

async function getBatchesByStatus(mspId, status) {
  return fabricService.evaluateTransaction(mspId, 'getBatchesByStatus', status);
}

async function batchExists(mspId, batchId) {
  return fabricService.evaluateTransaction(mspId, 'batchExists', batchId);
}

async function getBatchHistory(mspId, batchId) {
  const history = await fabricService.evaluateTransaction(mspId, 'getBatchHistory', batchId);
  if (!history || typeof history !== 'object') return history;
  const batchStatus = history.batch?.status;
  const events = Array.isArray(history.events)
    ? history.events.map((event) => ({
        ...event,
        recallStatus: event.recallStatus || deriveTransactionRecallStatus(event, batchStatus),
      }))
    : [];
  return { ...history, events };
}

function deriveTransactionRecallStatus(event, batchStatus) {
  const status = String(batchStatus || '').toUpperCase();
  if (status !== 'CONTAMINATED' && status !== 'RECALLED') return 'NONE';
  if (String(event?.stage || '').toUpperCase() === 'STATUS_CHANGE') return 'RECALL_TX';
  return 'AFFECTED';
}

async function searchBatches(mspId, query) {
  const all = (await getAllBatches(mspId)) || [];
  const q = String(query || '').trim().toLowerCase();
  if (!q) return all;
  return all.filter((batch) => {
    return (
      String(batch.batchId || '').toLowerCase().includes(q) ||
      String(batch.product || '').toLowerCase().includes(q) ||
      String(batch.originActor || '').toLowerCase().includes(q) ||
      String(batch.originLocation || '').toLowerCase().includes(q) ||
      String(batch.status || '').toLowerCase().includes(q)
    );
  });
}

async function addSupplyChainEvent(mspId, batchId, { stage, actor, location, details }) {
  const { result, transactionId } = await fabricService.submitTransaction(
    mspId,
    'addSupplyChainEvent',
    batchId,
    stage,
    actor,
    location,
    detailsToJson(details)
  );
  return { ...result, transactionId: result?.transactionId || transactionId };
}

async function getEvents(mspId, batchId) {
  const history = await getBatchHistory(mspId, batchId);
  return history?.events || [];
}

async function verifyBatchIntegrity(mspId, batchId) {
  return fabricService.evaluateTransaction(mspId, 'verifyBatchIntegrity', batchId);
}

async function getPublicBatchView(mspId, batchId) {
  return fabricService.evaluateTransaction(mspId, 'getPublicBatchView', batchId);
}

async function getDashboardStats(mspId) {
  return fabricService.evaluateTransaction(mspId, 'getDashboardStats');
}

module.exports = {
  registerBatch,
  getBatch,
  getAllBatches,
  getBatchesByStatus,
  batchExists,
  getBatchHistory,
  searchBatches,
  addSupplyChainEvent,
  getEvents,
  verifyBatchIntegrity,
  getPublicBatchView,
  getDashboardStats,
};
