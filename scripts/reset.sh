#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
bash "${ROOT}/scripts/stop.sh"
rm -rf "${ROOT}/blockchain/network/organizations" \
       "${ROOT}/blockchain/network/channel-artifacts"/* \
       "${ROOT}/blockchain/network/bin" 2>/dev/null || true
mkdir -p "${ROOT}/blockchain/network/channel-artifacts"
echo "==> Reset complete. Run ./scripts/setup-network.sh to recreate."
