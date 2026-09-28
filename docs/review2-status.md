# Review 2 — Requirements checklist

Mapped from `Case_Study_Review_2_SRM_Template.pptx` against this repository.

| # | Requirement (from PPT) | Status | Evidence |
|---|------------------------|--------|----------|
| 1 | Fabric 2.5 network: 5 orgs + orderer, channel `foodchannel` | **Complete** | `blockchain/network/`, `scripts/setup-network.sh`, `create-channel.sh` |
| 2 | Chaincode `foodtrace` with MSP-enforced role checks | **Complete** | `foodTraceabilityContract.js` `_requireRole` / `_requireStagePermission` |
| 3 | Express REST + JWT mapped to Fabric identities | **Complete** | `backend/src` auth + Gateway |
| 4 | React (Vite) UI + public QR `/verify/:batchId` | **Complete** | `frontend/`, `VerifyPublic.jsx`, batch QR |
| 5 | Docker Compose, scripts, Makefile, tests, docs | **Complete** | `Makefile`, `scripts/`, `docs/*`, `npm test` |
| 6 | Append-only hash-linked events | **Complete** | ORIGIN genesis + chained `previousHash` |
| 7 | Targeted recalls from ledger events only | **Complete** | `flagContamination` + `_buildRecall` / `deriveTouchpoints` |
| 8 | Auditor verification + integrity report with txIds | **Complete** | `verifyBatchIntegrity`, Audit page |
| 9 | Public consumer QR verification (no login) | **Complete** | `GET /api/public/verify/:batchId` |
| 10 | Scenario: Farm registers batch → Fabric txId | **Complete** | lifecycle test + RegisterBatch UI |
| 11 | Scenario: processor/distributor/store append events | **Complete** | lifecycle test + AddEvent UI |
| 12 | Scenario: Farm WALMART_STORE rejected by MSP | **Complete** | lifecycle test #3 + backend role middleware |
| 13 | Scenario: contamination → recall of touched stores | **Complete** | lifecycle test #4 + Recalls page |
| 14 | Scenario: auditor verifies hashes | **Complete** | lifecycle test #5 + Audit page |
| 15 | Scenario: customer scans QR | **Complete** | lifecycle test #6 + VerifyPublic |
| 16 | Transaction recall status on events | **Complete** | `recallStatus`: NONE / AFFECTED / RECALL_TX |
| 17 | Limitations documented | **Complete** | `docs/architecture.md` |
| 18 | Phase 1 client-side prototype kept separate | **Complete** | `../food-traceability` (localStorage SHA-256) |

## How to re-run validation

```bash
# From WSL or Git Bash at repo root
make test
# or
cd blockchain/chaincode/food-traceability && npm install && npm test
cd backend && npm test
```

## Live network (optional for viva)

```bash
./scripts/start.sh          # network + channel + chaincode + seed
# then backend + frontend on ports 4000 / 5173
```

Follow the script in `docs/demo.md` (batch `MNG1024`).
