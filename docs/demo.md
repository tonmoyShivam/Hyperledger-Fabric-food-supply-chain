# Demo script (viva / review)

## Accounts

Password for all: `Password123!`

| Email | Role |
|-------|------|
| farm@foodchain.local | Farm |
| processor@foodchain.local | Processor |
| distributor@foodchain.local | Distributor |
| store@foodchain.local | Store Admin |
| auditor@foodchain.local | Auditor |

## Flow

1. Login as **farm** → Register `MNG1024` / Fresh Mangoes / Green Valley Farms / Andhra Pradesh (or use seeded data).
2. Login as **processor** → Add PROCESSOR event (FreshPack / Hyderabad).
3. Login as **distributor** → Add DISTRIBUTOR event (ABC Distribution / Chennai).
4. Login as **store** → Add Walmart Chennai, Walmart Bangalore, optional customer sale.
5. Open batch history → show **Fabric transaction IDs** and hash chain.
6. **Verify** → ✓ BLOCKCHAIN VERIFIED.
7. **Integrity Demonstration** → tamper actor in memory → show hash mismatch (ledger unchanged).
8. **Flag contamination** → Salmonella reason → view **targeted recall** (only actual stores).
9. Login as **auditor** → Audit page → verify chain.
10. Open **/verify/MNG1024** or scan QR → public customer view.

## Emphasize

- Source of truth is **Hyperledger Fabric**, not localStorage.
- MSP identity enforces who may write which stages.
- Recall touchpoints are **computed from ledger events**.
