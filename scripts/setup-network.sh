#!/usr/bin/env bash
# Download Fabric binaries and generate crypto + genesis for foodchannel
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NET="${ROOT}/blockchain/network"
export PATH="${NET}/bin:${PATH}"
export FABRIC_CFG_PATH="${NET}/configtx"

FABRIC_VERSION="${FABRIC_VERSION:-2.5.16}"
CA_VERSION="${CA_VERSION:-1.5.15}"

echo "==> Food Supply Chain — setup-network (Fabric ${FABRIC_VERSION})"

command -v docker >/dev/null || { echo "Docker is required (WSL2 + Docker Desktop integration)"; exit 1; }
command -v curl >/dev/null || { echo "curl is required"; exit 1; }

mkdir -p "${NET}/bin" "${NET}/organizations" "${NET}/channel-artifacts"

if [[ ! -x "${NET}/bin/cryptogen" ]]; then
  echo "==> Downloading Fabric binaries ${FABRIC_VERSION}..."
  TMP="$(mktemp -d)"
  curl -fsSL "https://github.com/hyperledger/fabric/releases/download/v${FABRIC_VERSION}/hyperledger-fabric-linux-amd64-${FABRIC_VERSION}.tar.gz" \
    -o "${TMP}/fabric.tar.gz"
  tar -xzf "${TMP}/fabric.tar.gz" -C "${TMP}"
  cp "${TMP}/bin/"* "${NET}/bin/"
  chmod +x "${NET}/bin/"*
  rm -rf "${TMP}"
fi

echo "==> Generating crypto material with cryptogen..."
rm -rf "${NET}/organizations"
"${NET}/bin/cryptogen" generate --config="${NET}/crypto-config.yaml" --output="${NET}/organizations"

echo "==> Generating genesis block and channel transaction..."
rm -f "${NET}/channel-artifacts/"*
"${NET}/bin/configtxgen" -profile FoodOrdererGenesis -channelID system-channel -outputBlock "${NET}/channel-artifacts/genesis.block"
"${NET}/bin/configtxgen" -profile FoodChannel -outputCreateChannelTx "${NET}/channel-artifacts/foodchannel.tx" -channelID foodchannel

for ORG in FarmOrg ProcessorOrg DistributorOrg RetailOrg AuditorOrg; do
  case $ORG in
    FarmOrg) MSP=FarmOrgMSP; HOST=farm.foodchain.com ;;
    ProcessorOrg) MSP=ProcessorOrgMSP; HOST=processor.foodchain.com ;;
    DistributorOrg) MSP=DistributorOrgMSP; HOST=distributor.foodchain.com ;;
    RetailOrg) MSP=RetailOrgMSP; HOST=retail.foodchain.com ;;
    AuditorOrg) MSP=AuditorOrgMSP; HOST=auditor.foodchain.com ;;
  esac
  "${NET}/bin/configtxgen" -profile FoodChannel -outputAnchorPeersUpdate \
    "${NET}/channel-artifacts/${ORG}anchors.tx" -channelID foodchannel -asOrg "${MSP}" || true
done

echo "==> Pulling Fabric Docker images..."
docker pull "hyperledger/fabric-peer:${FABRIC_VERSION}"
docker pull "hyperledger/fabric-orderer:${FABRIC_VERSION}"
docker pull "hyperledger/fabric-tools:${FABRIC_VERSION}"
docker pull "hyperledger/fabric-ccenv:${FABRIC_VERSION}"
docker pull "hyperledger/fabric-nodeenv:2.5"
docker pull couchdb:3.3.3

echo "==> Starting network containers..."
cd "${NET}"
docker compose -f docker-compose.yaml up -d

echo "==> Waiting for peers..."
sleep 12
docker compose -f docker-compose.yaml ps

echo "==> Setup complete. Next: ./scripts/create-channel.sh"
