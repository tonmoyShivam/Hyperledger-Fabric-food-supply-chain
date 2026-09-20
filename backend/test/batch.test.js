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

describe('Batch API', () => {
  let app;
  let farmToken;
  let processorToken;

  before(() => {
    app = createApp();
  });

  beforeEach(async () => {
    sinon.restore();

    const farmLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'farm@foodchain.local', password: DEMO_PASSWORD });
    farmToken = farmLogin.body.token;

    const processorLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'processor@foodchain.local', password: DEMO_PASSWORD });
    processorToken = processorLogin.body.token;
  });

  afterEach(() => {
    sinon.restore();
  });

  it('rejects unauthenticated batch create', async () => {
    const res = await request(app).post('/api/batches').send({
      batchId: 'BATCH-001',
      product: 'Organic Apples',
      originActor: 'Green Valley Farm',
      originLocation: 'Sonoma, CA',
    });
    expect(res.status).to.equal(401);
  });

  it('creates a batch via registerBatch submit', async () => {
    const ledgerResult = {
      success: true,
      batchId: 'BATCH-001',
      batch: {
        batchId: 'BATCH-001',
        product: 'Organic Apples',
        status: 'SAFE',
        eventCount: 1,
      },
      transactionId: 'tx-register-1',
    };

    sinon.stub(fabricService, 'submitTransaction').resolves({
      result: ledgerResult,
      transactionId: 'tx-register-1',
    });

    const res = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${farmToken}`)
      .send({
        batchId: 'BATCH-001',
        product: 'Organic Apples',
        originActor: 'Green Valley Farm',
        originLocation: 'Sonoma, CA',
        details: { variety: 'Honeycrisp' },
      });

    expect(res.status).to.equal(201);
    expect(res.body.success).to.equal(true);
    expect(res.body.data.batchId).to.equal('BATCH-001');
    expect(fabricService.submitTransaction.calledOnce).to.equal(true);
    expect(fabricService.submitTransaction.firstCall.args[0]).to.equal('FarmOrgMSP');
    expect(fabricService.submitTransaction.firstCall.args[1]).to.equal('registerBatch');
  });

  it('lists batches', async () => {
    sinon.stub(fabricService, 'evaluateTransaction').resolves([
      { batchId: 'BATCH-001', product: 'Organic Apples', status: 'SAFE' },
      { batchId: 'BATCH-002', product: 'Leafy Greens', status: 'SAFE' },
    ]);

    const res = await request(app)
      .get('/api/batches')
      .set('Authorization', `Bearer ${farmToken}`);

    expect(res.status).to.equal(200);
    expect(res.body.count).to.equal(2);
    expect(res.body.data[0].batchId).to.equal('BATCH-001');
  });

  it('searches batches by query', async () => {
    sinon.stub(fabricService, 'evaluateTransaction').resolves([
      { batchId: 'BATCH-001', product: 'Organic Apples', status: 'SAFE', originActor: 'Farm A', originLocation: 'CA' },
      { batchId: 'BATCH-002', product: 'Leafy Greens', status: 'SAFE', originActor: 'Farm B', originLocation: 'OR' },
    ]);

    const res = await request(app)
      .get('/api/batches/search')
      .query({ q: 'apples' })
      .set('Authorization', `Bearer ${farmToken}`);

    expect(res.status).to.equal(200);
    expect(res.body.count).to.equal(1);
    expect(res.body.data[0].product).to.equal('Organic Apples');
  });

  it('returns batch history', async () => {
    sinon.stub(fabricService, 'evaluateTransaction').resolves({
      batch: { batchId: 'BATCH-001', status: 'SAFE' },
      events: [{ eventId: 'BATCH-001-0', stage: 'ORIGIN' }],
    });

    const res = await request(app)
      .get('/api/batches/BATCH-001/history')
      .set('Authorization', `Bearer ${farmToken}`);

    expect(res.status).to.equal(200);
    expect(res.body.data.events).to.have.length(1);
  });

  it('adds a processor event', async () => {
    sinon.stub(fabricService, 'submitTransaction').resolves({
      result: {
        success: true,
        eventId: 'BATCH-001-1',
        event: { stage: 'PROCESSOR' },
        transactionId: 'tx-event-1',
      },
      transactionId: 'tx-event-1',
    });

    const res = await request(app)
      .post('/api/batches/BATCH-001/events')
      .set('Authorization', `Bearer ${processorToken}`)
      .send({
        stage: 'PROCESSOR',
        actor: 'FreshPack Facility',
        location: 'Sacramento, CA',
        details: { temperature: '4C' },
      });

    expect(res.status).to.equal(201);
    expect(res.body.data.eventId).to.equal('BATCH-001-1');
    expect(fabricService.submitTransaction.firstCall.args[0]).to.equal('ProcessorOrgMSP');
  });

  it('forbids farm from adding processor events', async () => {
    const res = await request(app)
      .post('/api/batches/BATCH-001/events')
      .set('Authorization', `Bearer ${farmToken}`)
      .send({
        stage: 'PROCESSOR',
        actor: 'Someone',
        location: 'Somewhere',
      });

    expect(res.status).to.equal(403);
  });

  it('verifies batch integrity', async () => {
    sinon.stub(fabricService, 'evaluateTransaction').resolves({
      valid: true,
      batchId: 'BATCH-001',
      blocksChecked: 2,
      validBlocks: 2,
      invalidBlocks: 0,
    });

    const res = await request(app)
      .get('/api/batches/BATCH-001/verify')
      .set('Authorization', `Bearer ${farmToken}`);

    expect(res.status).to.equal(200);
    expect(res.body.data.valid).to.equal(true);
  });

  it('exposes public verify without auth', async () => {
    sinon.stub(fabricService, 'evaluateTransaction').resolves({
      batchId: 'BATCH-001',
      product: 'Organic Apples',
      status: 'SAFE',
      journey: [],
      verification: { valid: true, blocksChecked: 1 },
    });

    const res = await request(app).get('/api/public/verify/BATCH-001');
    expect(res.status).to.equal(200);
    expect(res.body.data.batchId).to.equal('BATCH-001');
    expect(fabricService.evaluateTransaction.firstCall.args[0]).to.equal('FarmOrgMSP');
    expect(fabricService.evaluateTransaction.firstCall.args[1]).to.equal('getPublicBatchView');
  });
});
