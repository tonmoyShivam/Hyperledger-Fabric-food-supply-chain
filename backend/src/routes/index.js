'use strict';

const express = require('express');
const authRoutes = require('./authRoutes');
const batchRoutes = require('./batchRoutes');
const recallRoutes = require('./recallRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const publicRoutes = require('./publicRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/batches', batchRoutes);
router.use('/recalls', recallRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/public', publicRoutes);

router.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
