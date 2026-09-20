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

describe('Recall API', () => {
  let app;
  let storeToken;
  let auditorToken;

  before(() => {
    app = createApp();
  });

  beforeEach(async () => {
    sinon.restore();

    const storeLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'store@foodchain.local', password: DEMO_PASSWORD });
    storeToken = storeLogin.body.token;

    const auditorLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'auditor@foodchain.local', password: DEMO_PASSWORD });
    auditorToken = auditorLogin.body.token;
  });

  afterEach(() => {
    sinon.restore();
  });

  it('flags contamination and returns recall payload', async () => {
    sinon.stub(fabricService, 'submitTransaction').resolves({
      result: {
        success: true,
        batch: { batchId: 'BATCH-001', status: 'CONTAMINATED' },
        recall: {
          recallId: 'REC-2026-BATCH-001',
          batchId: 'BATCH-001',
          reason: 'E. coli detected',
          stores: [{ actor: 'Store 42', location: 'Austin, TX' }],
        },
        transactionId: 'tx-contam-1',
      },
      transactionId: 'tx-contam-1',
    });

    const res = await request(app)
      .post('/api/batches/BATCH-001/contaminate')
      .set('Authorization', `Bearer ${storeToken}`)
      .send({ reason: 'E. coli detected', notes: 'Lab confirmed' });

    expect(res.status).to.equal(201);
    expect(res.body.data.batch.status).to.equal('CONTAMINATED');
    expect(res.body.data.recall.recallId).to.equal('REC-2026-BATCH-001');
    expect(fabricService.submitTransaction.firstCall.args[0]).to.equal('RetailOrgMSP');
    expect(fabricService.submitTransaction.firstCall.args[1]).to.equal('flagContamination');
  });

  it('rejects contamination without reason', async () => {
    const res = await request(app)
      .post('/api/batches/BATCH-001/contaminate')
      .set('Authorization', `Bearer ${storeToken}`)
      .send({ notes: 'missing reason' });

    expect(res.status).to.equal(400);
    expect(res.body.code).to.equal('VALIDATION_ERROR');
  });

  it('forbids auditor from flagging contamination', async () => {
    const res = await request(app)
      .post('/api/batches/BATCH-001/contaminate')
      .set('Authorization', `Bearer ${auditorToken}`)
      .send({ reason: 'Should not work' });

    expect(res.status).to.equal(403);
  });

  it('gets recall for a batch', async () => {
    sinon.stub(fabricService, 'evaluateTransaction').resolves({
      recallId: 'REC-2026-BATCH-001',
      batchId: 'BATCH-001',
      reason: 'E. coli detected',
    });

    const res = await request(app)
      .get('/api/batches/BATCH-001/recall')
      .set('Authorization', `Bearer ${storeToken}`);

    expect(res.status).to.equal(200);
    expect(res.body.data.recallId).to.equal('REC-2026-BATCH-001');
    expect(fabricService.evaluateTransaction.firstCall.args[1]).to.equal('getRecallReport');
  });

  it('lists all recalls', async () => {
    sinon.stub(fabricService, 'evaluateTransaction').resolves([
      { recallId: 'REC-2026-BATCH-001', batchId: 'BATCH-001' },
      { recallId: 'REC-2026-BATCH-002', batchId: 'BATCH-002' },
    ]);

    const res = await request(app)
      .get('/api/recalls')
      .set('Authorization', `Bearer ${auditorToken}`);

    expect(res.status).to.equal(200);
    expect(res.body.count).to.equal(2);
    expect(fabricService.evaluateTransaction.firstCall.args[1]).to.equal('getAllRecalls');
  });
});
