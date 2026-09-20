'use strict';

const express = require('express');
const batchController = require('../controllers/batchController');
const eventController = require('../controllers/eventController');
const recallController = require('../controllers/recallController');
const { authenticate } = require('../middleware/auth');
const { requireRoles } = require('../middleware/roles');

const router = express.Router();

router.use(authenticate);

router.post('/', requireRoles('FARM'), batchController.createBatch);
router.get('/', requireRoles('FARM', 'PROCESSOR', 'DISTRIBUTOR', 'STORE_ADMIN', 'AUDITOR'), batchController.listBatches);
router.get('/search', requireRoles('FARM', 'PROCESSOR', 'DISTRIBUTOR', 'STORE_ADMIN', 'AUDITOR'), batchController.searchBatches);

router.get('/:batchId', requireRoles('FARM', 'PROCESSOR', 'DISTRIBUTOR', 'STORE_ADMIN', 'AUDITOR'), batchController.getBatch);
router.get('/:batchId/history', requireRoles('FARM', 'PROCESSOR', 'DISTRIBUTOR', 'STORE_ADMIN', 'AUDITOR'), batchController.getBatchHistory);

router.post(
  '/:batchId/events',
  requireRoles('PROCESSOR', 'DISTRIBUTOR', 'STORE_ADMIN'),
  eventController.addEvent
);
router.get(
  '/:batchId/events',
  requireRoles('FARM', 'PROCESSOR', 'DISTRIBUTOR', 'STORE_ADMIN', 'AUDITOR'),
  eventController.listEvents
);

router.get(
  '/:batchId/verify',
  requireRoles('FARM', 'PROCESSOR', 'DISTRIBUTOR', 'STORE_ADMIN', 'AUDITOR'),
  batchController.verifyBatch
);
router.get(
  '/:batchId/integrity',
  requireRoles('FARM', 'PROCESSOR', 'DISTRIBUTOR', 'STORE_ADMIN', 'AUDITOR'),
  batchController.getIntegrity
);

router.post('/:batchId/contaminate', requireRoles('STORE_ADMIN'), recallController.contaminate);
router.get(
  '/:batchId/recall',
  requireRoles('FARM', 'PROCESSOR', 'DISTRIBUTOR', 'STORE_ADMIN', 'AUDITOR'),
  recallController.getBatchRecall
);

module.exports = router;
