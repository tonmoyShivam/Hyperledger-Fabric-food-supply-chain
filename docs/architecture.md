# Architecture — Food Supply Chain Traceability (Hyperledger Fabric)

## Overall

```
Web Frontend (React/Vite)
        │  REST + JWT
Backend API (Express + Fabric Gateway SDK)
        │  gRPC / TLS
Hyperledger Fabric Network
   Orderer + Peers (Farm, Processor, Distributor, Retail, Auditor)
        │
   Channel: foodchannel
        │
   Chaincode: foodtrace (FoodTraceabilityContract)
        │
   World State (CouchDB per peer) + Blockchain ledger (blocks)
```

## Organizations

| Org | MSP | Role | Peer port |
|-----|-----|------|-----------|
| FarmOrg | FarmOrgMSP | FARM | 7051 |
| ProcessorOrg | ProcessorOrgMSP | PROCESSOR | 9051 |
| DistributorOrg | DistributorOrgMSP | DISTRIBUTOR | 11051 |
| RetailOrg | RetailOrgMSP | STORE_ADMIN | 13051 |
| AuditorOrg | AuditorOrgMSP | AUDITOR | 15051 |
| OrdererOrg | OrdererMSP | ordering | 7050 |

## Transaction flow

```
User → Frontend → REST API → JWT + role check
  → Fabric Gateway (org identity)
  → Peer endorse (chaincode MSP checks)
  → Orderer
  → Commit to all peers
  → World state + block ledger
  → API response (includes Fabric transactionId)
  → Frontend
```

## Batch lifecycle

Register (ORIGIN) → PROCESSOR → DISTRIBUTOR → WALMART_STORE → CUSTOMER_SALE
→ optional STATUS_CHANGE (contamination) → Recall derived from events

## Recall flow

Store Admin flags contamination → STATUS_CHANGE event hashed & committed
→ Chaincode derives touchpoints from event history only
→ Recall lists only stores that actually handled the batch

## Audit flow

Auditor queries history → recalculates SHA-256 hashes → validates previousHash links
→ Returns integrity report + Fabric transaction IDs

## QR / customer flow

Scan QR → `/verify/:batchId` → public API → Fabric evaluate → journey + status (read-only)

## Hash chain (application-level)

```
Event 0: previousHash = 000…0 ; hash = SHA256(payload)
Event 1: previousHash = hash0 ; hash = SHA256(payload)
…
```

Fabric provides ledger immutability; the hash chain provides demonstrable field-level integrity for viva demos.

## Future AWS sketch

Route 53 → CloudFront → ALB → EKS (frontend/backend) → Fabric on EKS
+ CloudWatch, Secrets Manager, KMS, S3
