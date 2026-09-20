'use strict';

const auditService = require('../services/auditService');

async function dashboardStats(req, res, next) {
  try {
    const data = await auditService.getDashboardStats(req.user.mspId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getIntegrity(req, res, next) {
  try {
    const { batchId } = req.params;
    const data = await auditService.getIntegrityReport(req.user.mspId, batchId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getAuditTrail(req, res, next) {
  try {
    const { batchId } = req.params;
    const data = await auditService.getFullAuditTrail(req.user.mspId, batchId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  dashboardStats,
  getIntegrity,
  getAuditTrail,
};
