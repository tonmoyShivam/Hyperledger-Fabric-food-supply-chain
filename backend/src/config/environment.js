'use strict';

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true' || String(value) === '1';
};

const environment = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  fabricChannelName: process.env.FABRIC_CHANNEL_NAME || 'foodchannel',
  fabricChaincodeName: process.env.FABRIC_CHAINCODE_NAME || 'foodtrace',
  fabricGatewayPeer: process.env.FABRIC_GATEWAY_PEER || 'localhost:7051',
  fabricMock: toBool(process.env.FABRIC_MOCK, false),
  fabricCryptoPath: process.env.FABRIC_CRYPTO_PATH || '../blockchain/network/organizations',
  fabricPeerOrgPath:
    process.env.FABRIC_PEER_ORG_PATH || '../blockchain/network/organizations/peerOrganizations',
  demoMode: toBool(process.env.DEMO_MODE, false),
  logLevel: process.env.LOG_LEVEL || 'info',
  isProduction: (process.env.NODE_ENV || 'development') === 'production',
});

module.exports = environment;
