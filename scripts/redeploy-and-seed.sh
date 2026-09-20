#!/usr/bin/env bash
set -euo pipefail
cd "/mnt/f/Case Study/food-supply-chain"
# Remove stale chaincode containers
docker ps -aq --filter name=dev-peer | xargs -r docker rm -f || true
export CC_SEQUENCE=2
bash ./scripts/deploy-chaincode.sh
bash ./scripts/seed-data.sh
