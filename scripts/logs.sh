#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE="${1:-}"
cd "${ROOT}/blockchain/network"
if [[ -n "${SERVICE}" ]]; then
  docker compose -f docker-compose.yaml logs -f --tail=200 "${SERVICE}"
else
  docker compose -f docker-compose.yaml logs -f --tail=100
fi
