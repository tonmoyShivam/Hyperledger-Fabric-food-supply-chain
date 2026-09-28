'use strict';

const { expect } = require('chai');
const FoodTraceabilityContract = require('../lib/foodTraceabilityContract');
const { deriveTouchpoints } = require('../lib/recall');

/**
 * Minimal in-memory Fabric stub for chaincode method tests (Review 2 scenarios).
 */
function createMockCtx(mspId) {
  const state = new Map();
  let txCounter = 0;
  const stub = {
    getState: async (key) => {
      if (!state.has(key)) return Buffer.from('');
      return Buffer.from(state.get(key));
    },
    putState: async (key, value) => {
      state.set(key, Buffer.isBuffer(value) ? value.toString() : String(value));
    },
    getTxID: () => `tx-${++txCounter}`,
    getTxTimestamp: () => ({
      seconds: { low: Math.floor(Date.now() / 1000) },
      nanos: 0,
    }),
  };
  return {
    stub,
    clientIdentity: {
      getMSPID: () => mspId,
    },
    _state: state,
  };
}

describe('FoodTraceabilityContract lifecycle (Review 2 scenarios)', () => {
  const contract = new FoodTraceabilityContract();

  it('1) Farm registers batch — ORIGIN committed with Fabric txId', async () => {
    const ctx = createMockCtx('FarmOrgMSP');
    await contract.InitLedger(ctx);
    const raw = await contract.registerBatch(
      ctx,
      'MNG1024',
      'Fresh Mangoes',
      'Green Valley Farms',
      'Andhra Pradesh',
      JSON.stringify({ notes: 'Grade A' })
    );
    const result = JSON.parse(raw);
    expect(result.success).to.equal(true);
    expect(result.batchId).to.equal('MNG1024');
    expect(result.transactionId).to.match(/^tx-/);
    expect(result.event.stage).to.equal('ORIGIN');
    expect(result.event.previousHash).to.equal('0'.repeat(64));
    expect(result.batch.status).to.equal('SAFE');
  });

  it('2) Processor / distributor / store append hash-linked events', async () => {
    const farm = createMockCtx('FarmOrgMSP');
    await contract.InitLedger(farm);
    await contract.registerBatch(farm, 'MNG1024', 'Fresh Mangoes', 'Farm', 'AP', '{}');

    // Share ledger state across org contexts
    const processor = createMockCtx('ProcessorOrgMSP');
    processor._state = farm._state;
    processor.stub.getState = farm.stub.getState;
    processor.stub.putState = farm.stub.putState;

    const pRaw = await contract.addSupplyChainEvent(
      processor,
      'MNG1024',
      'PROCESSOR',
      'FreshPack',
      'Hyderabad',
      '{}'
    );
    const p = JSON.parse(pRaw);
    expect(p.event.stage).to.equal('PROCESSOR');
    expect(p.event.previousHash).to.have.length(64);
    expect(p.hash).to.have.length(64);

    const distributor = createMockCtx('DistributorOrgMSP');
    distributor.stub.getState = farm.stub.getState;
    distributor.stub.putState = farm.stub.putState;
    const d = JSON.parse(
      await contract.addSupplyChainEvent(distributor, 'MNG1024', 'DISTRIBUTOR', 'ABC Dist', 'Chennai', '{}')
    );
    expect(d.event.previousHash).to.equal(p.hash);

    const store = createMockCtx('RetailOrgMSP');
    store.stub.getState = farm.stub.getState;
    store.stub.putState = farm.stub.putState;
    const s = JSON.parse(
      await contract.addSupplyChainEvent(store, 'MNG1024', 'WALMART_STORE', 'Walmart Chennai', 'Chennai', '{}')
    );
    expect(s.event.previousHash).to.equal(d.hash);
  });

  it('3) Farm cannot submit WALMART_STORE — MSP rejection', async () => {
    const farm = createMockCtx('FarmOrgMSP');
    await contract.InitLedger(farm);
    await contract.registerBatch(farm, 'MNG1024', 'Fresh Mangoes', 'Farm', 'AP', '{}');

    try {
      await contract.addSupplyChainEvent(farm, 'MNG1024', 'WALMART_STORE', 'Fake Store', 'X', '{}');
      expect.fail('should have thrown');
    } catch (err) {
      expect(String(err.message)).to.match(/Unauthorized/i);
    }
  });

  it('4) Store flags contamination — RECALLED + targeted stores only', async () => {
    const farm = createMockCtx('FarmOrgMSP');
    await contract.InitLedger(farm);
    await contract.registerBatch(farm, 'MNG1024', 'Fresh Mangoes', 'Farm', 'AP', '{}');

    const share = (msp) => {
      const ctx = createMockCtx(msp);
      ctx.stub.getState = farm.stub.getState;
      ctx.stub.putState = farm.stub.putState;
      return ctx;
    };

    await contract.addSupplyChainEvent(share('ProcessorOrgMSP'), 'MNG1024', 'PROCESSOR', 'FreshPack', 'Hyd', '{}');
    await contract.addSupplyChainEvent(share('DistributorOrgMSP'), 'MNG1024', 'DISTRIBUTOR', 'ABC', 'Chn', '{}');
    await contract.addSupplyChainEvent(
      share('RetailOrgMSP'),
      'MNG1024',
      'WALMART_STORE',
      'Walmart Chennai',
      'Chennai',
      '{}'
    );
    await contract.addSupplyChainEvent(
      share('RetailOrgMSP'),
      'MNG1024',
      'WALMART_STORE',
      'Walmart Bangalore',
      'Bangalore',
      '{}'
    );

    const store = share('RetailOrgMSP');
    const result = JSON.parse(
      await contract.flagContamination(store, 'MNG1024', 'Salmonella detected', JSON.stringify({ severity: 'HIGH' }))
    );

    expect(result.batch.status).to.equal('RECALLED');
    expect(result.recall.stores).to.have.length(2);
    expect(result.recall.stores.map((s) => s.location)).to.include.members(['Chennai', 'Bangalore']);
    expect(result.recall.status).to.equal('ACTIVE');
    expect(result.event.recallStatus).to.equal('RECALL_TX');
    expect(result.transactionId).to.match(/^tx-/);

    const history = JSON.parse(await contract.getBatchHistory(share('AuditorOrgMSP'), 'MNG1024'));
    expect(history.events.every((e) => e.recallStatus)).to.equal(true);
    expect(history.events.filter((e) => e.recallStatus === 'AFFECTED')).to.have.length(5);
    expect(history.events.filter((e) => e.recallStatus === 'RECALL_TX')).to.have.length(1);
  });

  it('5) Auditor verifies integrity — hashes valid with txIds', async () => {
    const farm = createMockCtx('FarmOrgMSP');
    await contract.InitLedger(farm);
    await contract.registerBatch(farm, 'MNG1024', 'Fresh Mangoes', 'Farm', 'AP', '{}');
    const processor = createMockCtx('ProcessorOrgMSP');
    processor.stub.getState = farm.stub.getState;
    processor.stub.putState = farm.stub.putState;
    await contract.addSupplyChainEvent(processor, 'MNG1024', 'PROCESSOR', 'FreshPack', 'Hyd', '{}');

    const auditor = createMockCtx('AuditorOrgMSP');
    auditor.stub.getState = farm.stub.getState;
    auditor.stub.putState = farm.stub.putState;
    const report = JSON.parse(await contract.verifyBatchIntegrity(auditor, 'MNG1024'));
    expect(report.valid).to.equal(true);
    expect(report.blocksChecked).to.equal(2);
    expect(report.transactionIds).to.have.length(2);
  });

  it('6) Public view returns journey without writes', async () => {
    const farm = createMockCtx('FarmOrgMSP');
    await contract.InitLedger(farm);
    await contract.registerBatch(farm, 'MNG1024', 'Fresh Mangoes', 'Farm', 'AP', '{}');
    const view = JSON.parse(await contract.getPublicBatchView(farm, 'MNG1024'));
    expect(view.batchId).to.equal('MNG1024');
    expect(view.status).to.equal('SAFE');
    expect(view.journey).to.be.an('array');
    expect(view.verification.valid).to.equal(true);
  });

  it('deriveTouchpoints only lists stores that handled the batch', () => {
    const events = [
      { stage: 'ORIGIN', location: 'AP' },
      { stage: 'PROCESSOR', location: 'Hyd' },
      { stage: 'WALMART_STORE', location: 'Chennai' },
      { stage: 'STATUS_CHANGE', location: 'Chennai' },
    ];
    const tp = deriveTouchpoints(events);
    expect(tp.stores).to.have.length(1);
    expect(tp.stores[0].location).to.equal('Chennai');
  });
});
