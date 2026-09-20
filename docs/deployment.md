# Deployment (Windows + WSL2)

## Prerequisites

1. **Windows 10/11** with **WSL2**
2. **Ubuntu** distro in WSL2
3. **Docker Desktop** with WSL2 backend + Ubuntu integration enabled
4. **Node.js 20+** (Windows and/or WSL)
5. **curl**, **jq** (in WSL)
6. ~8 GB RAM free for multi-peer network

## Enable Docker in WSL

1. Start Docker Desktop
2. Settings → Resources → WSL Integration → enable your Ubuntu distro
3. In Ubuntu: `docker ps` should work

## One-time Fabric setup (run inside WSL)

```bash
cd /mnt/f/Case\ Study/food-supply-chain
chmod +x scripts/*.sh
./scripts/setup-network.sh      # binaries, crypto, genesis, containers
./scripts/create-channel.sh     # foodchannel + join peers
./scripts/deploy-chaincode.sh   # package/install/approve/commit Node chaincode
./scripts/seed-data.sh          # REAL Fabric invokes for demo batches
```

Or: `./scripts/start.sh` (all of the above).

## Backend / frontend (Windows PowerShell or WSL)

```powershell
cd "F:\Case Study\food-supply-chain\backend"
copy .env.example .env   # if needed
npm install
npm run dev              # http://localhost:4000

cd "F:\Case Study\food-supply-chain\frontend"
npm install
npm run dev              # http://localhost:5173
```

## Stop / reset

```bash
./scripts/stop.sh
./scripts/reset.sh       # wipe crypto + volumes — full recreate needed after
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `docker: command not found` in WSL | Enable Docker Desktop WSL integration |
| Peer fails to start | Wait for Docker engine; check `docker compose logs` |
| Backend `FABRIC_UNAVAILABLE` | Crypto not generated or peers down; run setup scripts |
| Chaincode install timeout | Increase Docker resources; retry deploy |
| Port conflicts | Free 7050/7051/9051/11051/13051/15051/4000/5173 |

## Production notes (not implemented)

- Real Fabric CA enrollment (not cryptogen)
- TLS everywhere, multiple orderers, multiple peers/org
- Kubernetes / EKS, HSM, Secrets Manager
- Stricter endorsement policies (MAJORITY)
