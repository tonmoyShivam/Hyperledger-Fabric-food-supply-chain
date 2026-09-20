'use strict';

const { createApp } = require('./app');
const environment = require('./config/environment');
const fabricService = require('./services/fabricService');
const logger = require('./utils/logger');

const app = createApp();

async function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down`);
  try {
    await fabricService.disconnect();
  } catch (err) {
    logger.warn('Error during Fabric disconnect', { message: err.message });
  }
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

if (require.main === module) {
  app.listen(environment.port, () => {
    logger.info('Food supply chain API listening', {
      port: environment.port,
      channel: environment.fabricChannelName,
      chaincode: environment.fabricChaincodeName,
      fabricMock: environment.fabricMock,
      demoMode: environment.demoMode,
    });
  });
}

module.exports = app;
