# Blockchain-Based Food Supply Chain Traceability System

**MTech / academic Hyperledger Fabric project** — permissioned ledger tracking food batches from farm → processor → distributor → Walmart store → customer sale.

> **Phase distinction:** The earlier `food-traceability/` folder is a **client-side hash-chain prototype**.  
> **This folder (`food-supply-chain/`) is the real Fabric implementation** — peers, orderer, chaincode, Gateway SDK, JWT API, React UI.

## Architecture (summary)

```
React (Vite) ──REST/JWT──► Express Backend ──Fabric Gateway──► Peers
                                                              │
                         foodchannel + foodtrace chaincode ◄───┘
                         CouchDB world state + block ledger
```

Orgs: **FarmOrg**, **ProcessorOrg**, **DistributorOrg**, **RetailOrg**, **AuditorOrg** + **Orderer**  
Channel: `foodchannel` · Chaincode: `foodtrace` · Fabric: **2.5.16**

## Features

- Real Fabric transactions (register, events, contamination, recall)
- Application-level SHA-256 event hash chain + Fabric tx IDs
- MSP-enforced roles in chaincode (not UI-only)
- JWT auth (bcrypt passwords) mapped to Fabric identities
- Targeted recall from ledger events only
- Auditor verification + in-memory integrity demonstration
- Public QR verification page
- Docker Compose network, scripts, Makefile, tests, docs

## Quick start (WSL2 + Docker Desktop)

**Windows PowerShell cannot run Fabric scripts directly.** Use **Ubuntu WSL2** with Docker integration.

### Docker Desktop checklist (required for peers)

1. Install/start **Docker Desktop**
2. Settings → **General** → Use the WSL 2 based engine
3. Settings → **Resources → WSL Integration** → enable **Ubuntu**
4. In Ubuntu run `docker ps` — it must succeed (not “docker.sock” errors)
5. Allocate ≥ **6–8 GB RAM** to Docker

Crypto material for all five orgs can be generated without Docker:

```bash
./scripts/generate-crypto.sh
```

Full network (needs working `docker`):

```bash
# In WSL Ubuntu
cd "/mnt/f/Case Study/food-supply-chain"
chmod +x scripts/*.sh
./scripts/start.sh          # setup + channel + deploy + seed
```

```powershell
# Backend (PowerShell or WSL)
cd "F:\Case Study\food-supply-chain\backend"
npm install
npm run dev                 # :4000

# Frontend
cd "F:\Case Study\food-supply-chain\frontend"
npm install
npm run dev                 # :5173
```

Login: `farm@foodchain.local` / `Password123!` (also processor, distributor, store, auditor).

## Makefile

```bash
make network-up | network-down | network-reset
make channel | deploy | seed | start | stop | status | logs
make backend | frontend | test | clean
```

## Project layout

```
food-supply-chain/
├── blockchain/network/     # Compose, configtx, crypto (generated)
├── blockchain/chaincode/   # Node FoodTraceabilityContract
├── backend/                # Express + Fabric Gateway
├── frontend/               # React + Vite
├── scripts/                # setup, channel, deploy, seed, …
└── docs/                   # architecture, api, blockchain, deployment, demo
```

## Documentation

| Doc | Content |
|-----|---------|
| [docs/architecture.md](docs/architecture.md) | Diagrams & flows |
| [docs/blockchain.md](docs/blockchain.md) | Fabric vs CouchDB, MSP rules |
| [docs/api.md](docs/api.md) | REST endpoints |
| [docs/deployment.md](docs/deployment.md) | WSL2 / Docker setup |
| [docs/demo.md](docs/demo.md) | Viva demonstration script |

## Tests

```bash
cd blockchain/chaincode/food-traceability && npm install && npm test
cd backend && npm test
```

## Security notes

- Do not commit `organizations/`, wallets, `*.pem`/`*.key`, or `.env`
- Chaincode rejects wrong-org stages even if JWT is forged for another role
- No event update/delete APIs — append-only history

## Limitations

- cryptogen demo identities (not production Fabric CA enrollment)
- Single peer per org, single orderer
- Endorsement policy is OR(any org peer) for demo simplicity
- Requires Docker Desktop resources (~8 GB RAM recommended)

## Future work

Multi-peer orgs, Raft multi-orderer, Kubernetes/EKS, real CA, IoT temperature/GPS, QR at scale, HSM, MAJORITY endorsement.

## License

Academic / educational use.
