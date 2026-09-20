#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}/blockchain/network"
docker compose -f docker-compose.yaml down --volumes --remove-orphans || true
echo "==> Network stopped"
