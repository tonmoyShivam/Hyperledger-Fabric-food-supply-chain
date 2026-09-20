'use strict';

const batchService = require('../services/batchService');
const { validate, registerBatchSchema } = require('../utils/validation');
const { AppError } = require('../middleware/errorHandler');

async function createBatch(req, res, next) {
  try {
    const payload = validate(registerBatchSchema, req.body);
    const result = await batchService.registerBatch(req.user.mspId, payload);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function listBatches(req, res, next) {
  try {
    const { status } = req.query;
    let data;
    if (status) {
      data = await batchService.getBatchesByStatus(req.user.mspId, String(status).toUpperCase());
    } else {
      data = await batchService.getAllBatches(req.user.mspId);
    }
    res.json({ success: true, count: Array.isArray(data) ? data.length : 0, data });
  } catch (err) {
    next(err);
  }
}

async function searchBatches(req, res, next) {
  try {
    const q = req.query.q || '';
    const data = await batchService.searchBatches(req.user.mspId, q);
    res.json({ success: true, query: q, count: data.length, data });
  } catch (err) {
    next(err);
  }
}

async function getBatch(req, res, next) {
  try {
    const { batchId } = req.params;
    const data = await batchService.getBatch(req.user.mspId, batchId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getBatchHistory(req, res, next) {
  try {
    const { batchId } = req.params;
    const data = await batchService.getBatchHistory(req.user.mspId, batchId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function verifyBatch(req, res, next) {
  try {
    const { batchId } = req.params;
    const data = await batchService.verifyBatchIntegrity(req.user.mspId, batchId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getIntegrity(req, res, next) {
  try {
    const { batchId } = req.params;
    const data = await batchService.verifyBatchIntegrity(req.user.mspId, batchId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function publicVerify(req, res, next) {
  try {
    const { batchId } = req.params;
    // Public QR verification evaluates via AuditorOrg (read-only MSP).
    const mspId = req.user?.mspId || 'AuditorOrgMSP';
    const data = await batchService.getPublicBatchView(mspId, batchId);
    if (!data) {
      throw new AppError(`Batch ${batchId} not found`, 404, 'NOT_FOUND');
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createBatch,
  listBatches,
  searchBatches,
  getBatch,
  getBatchHistory,
  verifyBatch,
  getIntegrity,
  publicVerify,
};
