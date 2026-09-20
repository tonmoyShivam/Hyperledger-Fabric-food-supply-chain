'use strict';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-mocha';
process.env.FABRIC_MOCK = 'false';

const { expect } = require('chai');
const request = require('supertest');
const sinon = require('sinon');
const { createApp } = require('../src/app');
const fabricService = require('../src/services/fabricService');
const { DEMO_PASSWORD } = require('../src/controllers/authController');

describe('Audit & Auth API', () => {
  let app;
  let auditorToken;

  before(() => {
    app = createApp();
  });

  beforeEach(async () => {
    sinon.restore();

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'auditor@foodchain.local', password: DEMO_PASSWORD });
    auditorToken = login.body.token;
  });

  afterEach(() => {
    sinon.restore();
  });

  it('logs in demo users and returns JWT with role/msp', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'farm@foodchain.local', password: DEMO_PASSWORD });

    expect(res.status).to.equal(200);
    expect(res.body.token).to.be.a('string');
    expect(res.body.user.role).to.equal('FARM');
    expect(res.body.user.mspId).to.equal('FarmOrgMSP');
  });

  it('rejects bad credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'farm@foodchain.local', password: 'WrongPassword!' });

    expect(res.status).to.equal(401);
    expect(res.body.code).to.equal('INVALID_CREDENTIALS');
  });

  it('returns current user profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(res.status).to.equal(200);
    expect(res.body.user.email).to.equal('auditor@foodchain.local');
    expect(res.body.user.role).to.equal('AUDITOR');
    expect(res.body.user.mspId).to.equal('AuditorOrgMSP');
  });

  it('returns dashboard stats', async () => {
    sinon.stub(fabricService, 'evaluateTransaction').resolves({
      totalBatches: 10,
      safeBatches: 8,
      contaminatedBatches: 1,
      recalledBatches: 1,
      totalEvents: 42,
      totalRecalls: 1,
    });

    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(res.status).to.equal(200);
    expect(res.body.data.totalBatches).to.equal(10);
    expect(fabricService.evaluateTransaction.firstCall.args[0]).to.equal('AuditorOrgMSP');
    expect(fabricService.evaluateTransaction.firstCall.args[1]).to.equal('getDashboardStats');
  });

  it('returns integrity report for a batch', async () => {
    sinon.stub(fabricService, 'evaluateTransaction').resolves({
      valid: false,
      batchId: 'BATCH-001',
      blocksChecked: 3,
      validBlocks: 2,
      invalidBlocks: 1,
      brokenLinks: 1,
      failures: [{ index: 2, reason: 'Hash mismatch' }],
    });

    const res = await request(app)
      .get('/api/batches/BATCH-001/integrity')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(res.status).to.equal(200);
    expect(res.body.data.valid).to.equal(false);
    expect(res.body.data.invalidBlocks).to.equal(1);
    expect(fabricService.evaluateTransaction.firstCall.args[1]).to.equal('verifyBatchIntegrity');
  });

  it('surfaces FABRIC_UNAVAILABLE when fabricService throws', async () => {
    const { FabricUnavailableError } = fabricService;
    sinon
      .stub(fabricService, 'evaluateTransaction')
      .rejects(new FabricUnavailableError('FABRIC_UNAVAILABLE: crypto material files are missing'));

    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(res.status).to.equal(503);
    expect(res.body.code).to.equal('FABRIC_UNAVAILABLE');
  });
});
