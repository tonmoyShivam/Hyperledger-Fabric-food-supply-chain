'use strict';

const express = require('express');
const batchController = require('../controllers/batchController');

const router = express.Router();

router.get('/verify/:batchId', batchController.publicVerify);

module.exports = router;
