'use strict';

const { expect } = require('chai');
const FoodTraceabilityContract = require('../lib/foodTraceabilityContract');

const { hashEvent, serializeDetails, GENESIS_PREV_HASH, MSP_ROLE, ROLE_STAGES } =
  FoodTraceabilityContract;

describe('FoodTraceabilityContract hashing', () => {
  it('uses 64-zero genesis previous hash', () => {
    expect(GENESIS_PREV_HASH).to.equal('0'.repeat(64));
  });

  it('serializes details deterministically', () => {
    const a = serializeDetails({ b: 1, a: 2 });
    const b = serializeDetails({ a: 2, b: 1 });
    expect(a).to.equal(b);
  });

  it('computes stable SHA-256 for identical event payloads', () => {
    const base = {
      index: 0,
      batchId: 'MNG1024',
      stage: 'ORIGIN',
      actor: 'Green Valley Farms',
      actorOrg: 'FarmOrgMSP',
      location: 'Andhra Pradesh',
      timestamp: '2026-09-10T09:30:00.000Z',
      details: { notes: 'Grade A', product: 'Fresh Mangoes' },
      previousHash: GENESIS_PREV_HASH,
    };
    const h1 = hashEvent(base);
    const h2 = hashEvent({ ...base, details: { product: 'Fresh Mangoes', notes: 'Grade A' } });
    expect(h1).to.equal(h2);
    expect(h1).to.match(/^[a-f0-9]{64}$/);
  });

  it('changes hash when actor is modified', () => {
    const base = {
      index: 1,
      batchId: 'MNG1024',
      stage: 'PROCESSOR',
      actor: 'FreshPack Processing',
      actorOrg: 'ProcessorOrgMSP',
      location: 'Hyderabad',
      timestamp: '2026-09-11T11:20:00.000Z',
      details: { notes: 'ok' },
      previousHash: 'a'.repeat(64),
    };
    const original = hashEvent(base);
    const tampered = hashEvent({ ...base, actor: 'Fake Processing Company' });
    expect(original).to.not.equal(tampered);
  });

  it('maps MSP IDs to roles', () => {
    expect(MSP_ROLE.FarmOrgMSP).to.equal('FARM');
    expect(MSP_ROLE.RetailOrgMSP).to.equal('STORE_ADMIN');
    expect(MSP_ROLE.AuditorOrgMSP).to.equal('AUDITOR');
  });

  it('restricts stages by role', () => {
    expect(ROLE_STAGES.FARM).to.deep.equal(['ORIGIN']);
    expect(ROLE_STAGES.PROCESSOR).to.include('PROCESSOR');
    expect(ROLE_STAGES.PROCESSOR).to.not.include('DISTRIBUTOR');
    expect(ROLE_STAGES.STORE_ADMIN).to.include('STATUS_CHANGE');
    expect(ROLE_STAGES.AUDITOR).to.deep.equal([]);
  });

  it('chains previousHash into next event hash', () => {
    const e0 = {
      index: 0,
      batchId: 'T1',
      stage: 'ORIGIN',
      actor: 'A',
      actorOrg: 'FarmOrgMSP',
      location: 'L',
      timestamp: '2026-01-01T00:00:00.000Z',
      details: {},
      previousHash: GENESIS_PREV_HASH,
    };
    const h0 = hashEvent(e0);
    const e1 = {
      ...e0,
      index: 1,
      stage: 'PROCESSOR',
      actorOrg: 'ProcessorOrgMSP',
      previousHash: h0,
    };
    const h1 = hashEvent(e1);
    const broken = hashEvent({ ...e1, previousHash: 'b'.repeat(64) });
    expect(h1).to.not.equal(broken);
  });
});
