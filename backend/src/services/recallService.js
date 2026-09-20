'use strict';

const fabricService = require('./fabricService');

async function flagContamination(mspId, batchId, { reason, notes }) {
  const { result, transactionId } = await fabricService.submitTransaction(
    mspId,
    'flagContamination',
    batchId,
    reason,
    notes || ''
  );
  return { ...result, transactionId: result?.transactionId || transactionId };
}

async function generateRecallReport(mspId, batchId) {
  const { result, transactionId } = await fabricService.submitTransaction(
    mspId,
    'generateRecallReport',
    batchId
  );
  return { ...(typeof result === 'object' ? result : { report: result }), transactionId };
}

async function getRecallReport(mspId, batchId) {
  return fabricService.evaluateTransaction(mspId, 'getRecallReport', batchId);
}

async function getAllRecalls(mspId) {
  return fabricService.evaluateTransaction(mspId, 'getAllRecalls');
}

module.exports = {
  flagContamination,
  generateRecallReport,
  getRecallReport,
  getAllRecalls,
};
