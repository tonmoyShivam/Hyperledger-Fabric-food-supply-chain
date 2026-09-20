'use strict';

const express = require('express');
const recallController = require('../controllers/recallController');
const { authenticate } = require('../middleware/auth');
const { requireRoles } = require('../middleware/roles');

const router = express.Router();

router.use(authenticate);
router.get(
  '/',
  requireRoles('FARM', 'PROCESSOR', 'DISTRIBUTOR', 'STORE_ADMIN', 'AUDITOR'),
  recallController.listRecalls
);

module.exports = router;
