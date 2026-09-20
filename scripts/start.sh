#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
bash "${ROOT}/scripts/setup-network.sh"
bash "${ROOT}/scripts/create-channel.sh"
bash "${ROOT}/scripts/deploy-chaincode.sh"
bash "${ROOT}/scripts/seed-data.sh"
echo "==> Network + chaincode + seed complete"
echo "Start backend:  cd backend && npm install && npm run dev"
echo "Start frontend: cd frontend && npm install && npm run dev"
