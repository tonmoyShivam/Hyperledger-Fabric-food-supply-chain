'use strict';

const express = require('express');
const auditController = require('../controllers/auditController');
const { authenticate } = require('../middleware/auth');
const { requireRoles } = require('../middleware/roles');

const router = express.Router();

router.use(authenticate);
router.get(
  '/stats',
  requireRoles('FARM', 'PROCESSOR', 'DISTRIBUTOR', 'STORE_ADMIN', 'AUDITOR'),
  auditController.dashboardStats
);

module.exports = router;
