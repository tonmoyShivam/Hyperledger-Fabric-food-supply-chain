# Blockchain notes

## Version

- Hyperledger Fabric **2.5.16** (LTS line)
- Fabric Gateway SDK (`@hyperledger/fabric-gateway`)
- Node chaincode (`fabric-contract-api` 2.5.x)
- CouchDB 3.3.3 as peer state DB
- Channel: `foodchannel`
- Chaincode: `foodtrace` / `FoodTraceabilityContract`

## What is / is not the blockchain

| Component | Role |
|-----------|------|
| Fabric ledger (blocks) | Immutable ordered transaction history |
| World state (CouchDB) | Current key/value of assets |
| Chaincode | Business logic + MSP authorization + hash chain |
| Fabric CA / cryptogen MSP | Identities (this demo uses cryptogen) |
| Peer | Endorse, commit, maintain ledger |
| Orderer | Total order of transactions |
| Channel | Private consortium ledger context |

**CouchDB is not the blockchain.** It is the queryable world-state database.

## MSP authorization in chaincode

```
FarmOrgMSP → FARM → registerBatch / ORIGIN only
ProcessorOrgMSP → PROCESSOR events only
DistributorOrgMSP → DISTRIBUTOR events only
RetailOrgMSP → WALMART_STORE, CUSTOMER_SALE, STATUS_CHANGE
AuditorOrgMSP → read / verify (no supply-chain writes)
```

Frontend and JWT checks are convenience layers. **Chaincode rejects unauthorized MSP submissions.**

## Immutability

There is no `updateEvent` / `deleteEvent`. Corrections use new append-only events (e.g. STATUS_CHANGE).

## Integrity demonstration

Fabric history cannot be edited via the app. The UI “Integrity Demonstration” clones event data **in memory**, mutates a field, and shows hash mismatch — explaining what would happen if recorded data were altered. It does **not** modify the Fabric ledger.
