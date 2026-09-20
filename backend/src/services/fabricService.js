'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const grpc = require('@grpc/grpc-js');
const { connect, hash, signers } = require('@hyperledger/fabric-gateway');
const environment = require('../config/environment');
const { getOrgConfig, channelName, chaincodeName } = require('../config/fabric');
const logger = require('../utils/logger');

class FabricUnavailableError extends Error {
  constructor(message, details = undefined) {
    super(message || 'FABRIC_UNAVAILABLE');
    this.name = 'FabricUnavailableError';
    this.statusCode = 503;
    this.code = 'FABRIC_UNAVAILABLE';
    this.details = details;
  }
}

/** @type {Map<string, { gateway: import('@hyperledger/fabric-gateway').Gateway, client: import('@grpc/grpc-js').Client }>} */
const connections = new Map();

function firstFileInDir(dirPath) {
  if (!fs.existsSync(dirPath)) return null;
  const stats = fs.statSync(dirPath);
  if (stats.isFile()) return dirPath;
  const entries = fs.readdirSync(dirPath).filter((name) => !name.startsWith('.'));
  if (!entries.length) return null;
  return path.join(dirPath, entries[0]);
}

function readIdentityFiles(orgConfig) {
  const certFile = firstFileInDir(orgConfig.certPath);
  const keyFile = firstFileInDir(orgConfig.keyPath);
  const tlsFile = orgConfig.tlsCertPath;

  const missing = [];
  if (!certFile || !fs.existsSync(certFile)) missing.push(`cert: ${orgConfig.certPath}`);
  if (!keyFile || !fs.existsSync(keyFile)) missing.push(`key: ${orgConfig.keyPath}`);
  if (!tlsFile || !fs.existsSync(tlsFile)) missing.push(`tls: ${orgConfig.tlsCertPath}`);

  if (missing.length) {
    throw new FabricUnavailableError(
      'FABRIC_UNAVAILABLE: crypto material files are missing. Generate the network before connecting.',
      { missing, mspId: orgConfig.mspId }
    );
  }

  return {
    certificate: fs.readFileSync(certFile),
    privateKeyPem: fs.readFileSync(keyFile),
    tlsRootCert: fs.readFileSync(tlsFile),
  };
}

function assertFabricReady(orgMsp) {
  if (environment.fabricMock) {
    throw new FabricUnavailableError(
      'FABRIC_UNAVAILABLE: FABRIC_MOCK=true — real ledger access is disabled (use sinon stubs in unit tests).'
    );
  }

  getOrgConfig(orgMsp);
}

function newGrpcConnection(orgConfig, tlsRootCert) {
  const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
  return new grpc.Client(orgConfig.peerEndpoint, tlsCredentials, {
    'grpc.ssl_target_name_override': orgConfig.peerHostAlias,
  });
}

function newIdentity(orgConfig, certificate) {
  return {
    mspId: orgConfig.mspId,
    credentials: certificate,
  };
}

function newSigner(privateKeyPem) {
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  return signers.newPrivateKeySigner(privateKey);
}

/**
 * Establish (or reuse) a Fabric Gateway connection for the given org MSP.
 */
async function connectOrg(orgMsp) {
  assertFabricReady(orgMsp);

  if (connections.has(orgMsp)) {
    return connections.get(orgMsp);
  }

  const orgConfig = getOrgConfig(orgMsp);
  let files;
  try {
    files = readIdentityFiles(orgConfig);
  } catch (err) {
    if (err instanceof FabricUnavailableError) throw err;
    throw new FabricUnavailableError(`FABRIC_UNAVAILABLE: ${err.message}`, {
      mspId: orgMsp,
      cause: err.message,
    });
  }

  try {
    const client = newGrpcConnection(orgConfig, files.tlsRootCert);
    const gateway = connect({
      client,
      identity: newIdentity(orgConfig, files.certificate),
      signer: newSigner(files.privateKeyPem),
      hash: hash.sha256,
      evaluateOptions: () => ({ deadline: Date.now() + 15000 }),
      endorseOptions: () => ({ deadline: Date.now() + 30000 }),
      submitOptions: () => ({ deadline: Date.now() + 15000 }),
      commitStatusOptions: () => ({ deadline: Date.now() + 60000 }),
    });

    const handle = { gateway, client };
    connections.set(orgMsp, handle);
    logger.info('Fabric gateway connected', { mspId: orgMsp, peer: orgConfig.peerEndpoint });
    return handle;
  } catch (err) {
    if (err instanceof FabricUnavailableError) throw err;
    throw new FabricUnavailableError(`FABRIC_UNAVAILABLE: failed to connect gateway — ${err.message}`, {
      mspId: orgMsp,
      peer: orgConfig.peerEndpoint,
      cause: err.message,
    });
  }
}

async function disconnect(orgMsp) {
  if (orgMsp) {
    const handle = connections.get(orgMsp);
    if (handle) {
      try {
        handle.gateway.close();
      } catch {
        // ignore
      }
      try {
        handle.client.close();
      } catch {
        // ignore
      }
      connections.delete(orgMsp);
      logger.info('Fabric gateway disconnected', { mspId: orgMsp });
    }
    return;
  }

  for (const msp of [...connections.keys()]) {
    await disconnect(msp);
  }
}

async function getContract(orgMsp) {
  const { gateway } = await connectOrg(orgMsp);
  const network = gateway.getNetwork(channelName);
  return network.getContract(chaincodeName);
}

function utf8Decoder() {
  return new TextDecoder();
}

function decodeResult(bytes) {
  if (bytes === undefined || bytes === null) return null;
  const text = utf8Decoder().decode(bytes);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Submit a transaction and wait for commit. Returns parsed result + transactionId.
 */
async function submitTransaction(orgMsp, name, ...args) {
  assertFabricReady(orgMsp);
  const contract = await getContract(orgMsp);
  const stringArgs = args.map((a) => (a === undefined || a === null ? '' : String(a)));

  try {
    const commit = await contract.submitAsync(name, { arguments: stringArgs });
    const transactionId = commit.getTransactionId();
    const resultBytes = commit.getResult();
    const status = await commit.getStatus();

    if (!status.successful) {
      const err = new Error(
        `Transaction ${transactionId} failed to commit with status code ${status.code}`
      );
      err.statusCode = 502;
      err.code = 'FABRIC_COMMIT_FAILED';
      err.transactionId = transactionId;
      throw err;
    }

    return {
      result: decodeResult(resultBytes),
      transactionId,
      statusCode: status.code,
    };
  } catch (err) {
    if (err instanceof FabricUnavailableError) throw err;
    if (err.code === 'FABRIC_COMMIT_FAILED') throw err;

    const wrapped = new Error(err.message || `Fabric submit failed: ${name}`);
    wrapped.statusCode = 502;
    wrapped.code = 'FABRIC_SUBMIT_ERROR';
    wrapped.cause = err;
    throw wrapped;
  }
}

/**
 * Evaluate (query) a transaction — no ledger write.
 */
async function evaluateTransaction(orgMsp, name, ...args) {
  assertFabricReady(orgMsp);
  const contract = await getContract(orgMsp);
  const stringArgs = args.map((a) => (a === undefined || a === null ? '' : String(a)));

  try {
    const resultBytes = await contract.evaluateTransaction(name, ...stringArgs);
    return decodeResult(resultBytes);
  } catch (err) {
    if (err instanceof FabricUnavailableError) throw err;
    const wrapped = new Error(err.message || `Fabric evaluate failed: ${name}`);
    wrapped.statusCode = 502;
    wrapped.code = 'FABRIC_EVALUATE_ERROR';
    wrapped.cause = err;
    throw wrapped;
  }
}

/**
 * Alias kept for callers that want the async submit path explicitly.
 */
async function submitAsync(orgMsp, name, ...args) {
  return submitTransaction(orgMsp, name, ...args);
}

module.exports = {
  FabricUnavailableError,
  connect: connectOrg,
  disconnect,
  getContract,
  submitTransaction,
  evaluateTransaction,
  submitAsync,
};
