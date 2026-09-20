'use strict';

const batchService = require('../services/batchService');
const { validate, addEventSchema } = require('../utils/validation');

async function addEvent(req, res, next) {
  try {
    const { batchId } = req.params;
    const payload = validate(addEventSchema, req.body);
    const result = await batchService.addSupplyChainEvent(req.user.mspId, batchId, payload);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function listEvents(req, res, next) {
  try {
    const { batchId } = req.params;
    const events = await batchService.getEvents(req.user.mspId, batchId);
    res.json({
      success: true,
      batchId: String(batchId).toUpperCase(),
      count: events.length,
      data: events,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  addEvent,
  listEvents,
};
