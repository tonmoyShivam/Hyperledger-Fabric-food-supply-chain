'use strict';

const recallService = require('../services/recallService');
const { validate, contaminateSchema } = require('../utils/validation');

async function contaminate(req, res, next) {
  try {
    const { batchId } = req.params;
    const payload = validate(contaminateSchema, req.body);
    const result = await recallService.flagContamination(req.user.mspId, batchId, payload);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getBatchRecall(req, res, next) {
  try {
    const { batchId } = req.params;
    const data = await recallService.getRecallReport(req.user.mspId, batchId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function listRecalls(req, res, next) {
  try {
    const data = await recallService.getAllRecalls(req.user.mspId);
    res.json({
      success: true,
      count: Array.isArray(data) ? data.length : 0,
      data,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  contaminate,
  getBatchRecall,
  listRecalls,
};
