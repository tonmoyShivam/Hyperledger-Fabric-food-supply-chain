#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}/blockchain/network"
docker compose -f docker-compose.yaml ps
echo ""
docker ps --filter "name=foodchain" --filter "name=peer0" --filter "name=orderer" --filter "name=couchdb" --filter "name=fabric-cli"
