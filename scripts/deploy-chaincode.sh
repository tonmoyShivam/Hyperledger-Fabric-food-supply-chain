#!/usr/bin/env bash
# Deploy foodtrace chaincode (Node) via Fabric lifecycle 2.x
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CC_NAME=foodtrace
CC_VERSION="${CC_VERSION:-1.0}"
CC_SEQUENCE="${CC_SEQUENCE:-2}"
CHANNEL=foodchannel
CC_LABEL="${CC_NAME}_${CC_VERSION}"
ORDERER=orderer.foodchain.com:7050
ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/foodchain.com/orderers/orderer.foodchain.com/msp/tlscacerts/tlsca.foodchain.com-cert.pem
BASE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations

echo "==> Packaging chaincode (sequence=${CC_SEQUENCE})..."
# Install deps on host for packaging consistency, then package inside CLI
cd "${ROOT}/blockchain/chaincode/food-traceability"
npm install --omit=dev

docker exec fabric-cli peer lifecycle chaincode package "channel-artifacts/${CC_NAME}.tar.gz" \
  --path /opt/gopath/src/github.com/chaincode/food-traceability \
  --lang node \
  --label "${CC_LABEL}"

install_cc() {
  local PEER=$1 MSP=$2 TLS=$3 MSPPATH=$4
  echo "==> Installing on ${PEER}"
  local out
  set +e
  out=$(docker exec \
    -e CORE_PEER_ADDRESS="${PEER}" \
    -e CORE_PEER_LOCALMSPID="${MSP}" \
    -e CORE_PEER_TLS_ROOTCERT_FILE="${TLS}" \
    -e CORE_PEER_MSPCONFIGPATH="${MSPPATH}" \
    fabric-cli peer lifecycle chaincode install "channel-artifacts/${CC_NAME}.tar.gz" 2>&1)
  local rc=$?
  set -e
  echo "${out}"
  if [[ $rc -ne 0 && "${out}" != *"already successfully installed"* ]]; then
    return "$rc"
  fi
  # Prefer package ID from install output (success or already-installed)
  local pid
  pid=$(echo "${out}" | tr -d '\r' | sed -n 's/.*package ID '"'"'\([^'"'"']*\)'"'"'.*/\1/p' | tail -1)
  if [[ -z "${pid}" ]]; then
    pid=$(echo "${out}" | tr -d '\r' | sed -n 's/.*Chaincode code package identifier: //p' | tail -1)
  fi
  if [[ -n "${pid}" ]]; then
    PACKAGE_ID="${pid}"
  fi
}

PACKAGE_ID=""
install_cc "peer0.farm.foodchain.com:7051" FarmOrgMSP \
  "${BASE}/farm.foodchain.com/peers/peer0.farm.foodchain.com/tls/ca.crt" \
  "${BASE}/farm.foodchain.com/users/Admin@farm.foodchain.com/msp"
install_cc "peer0.processor.foodchain.com:9051" ProcessorOrgMSP \
  "${BASE}/processor.foodchain.com/peers/peer0.processor.foodchain.com/tls/ca.crt" \
  "${BASE}/processor.foodchain.com/users/Admin@processor.foodchain.com/msp"
install_cc "peer0.distributor.foodchain.com:11051" DistributorOrgMSP \
  "${BASE}/distributor.foodchain.com/peers/peer0.distributor.foodchain.com/tls/ca.crt" \
  "${BASE}/distributor.foodchain.com/users/Admin@distributor.foodchain.com/msp"
install_cc "peer0.retail.foodchain.com:13051" RetailOrgMSP \
  "${BASE}/retail.foodchain.com/peers/peer0.retail.foodchain.com/tls/ca.crt" \
  "${BASE}/retail.foodchain.com/users/Admin@retail.foodchain.com/msp"
install_cc "peer0.auditor.foodchain.com:15051" AuditorOrgMSP \
  "${BASE}/auditor.foodchain.com/peers/peer0.auditor.foodchain.com/tls/ca.crt" \
  "${BASE}/auditor.foodchain.com/users/Admin@auditor.foodchain.com/msp"

if [[ -z "${PACKAGE_ID}" ]]; then
  PACKAGE_ID=$(docker exec \
    -e CORE_PEER_ADDRESS=peer0.farm.foodchain.com:7051 \
    -e CORE_PEER_LOCALMSPID=FarmOrgMSP \
    -e CORE_PEER_TLS_ROOTCERT_FILE="${BASE}/farm.foodchain.com/peers/peer0.farm.foodchain.com/tls/ca.crt" \
    -e CORE_PEER_MSPCONFIGPATH="${BASE}/farm.foodchain.com/users/Admin@farm.foodchain.com/msp" \
    fabric-cli peer lifecycle chaincode queryinstalled \
    | tr -d '\r' | sed -n "s/^Package ID: //p" | grep "${CC_LABEL}:" | tail -1 | cut -d',' -f1)
fi
echo "==> Package ID: ${PACKAGE_ID}"
echo "${PACKAGE_ID}" > "${ROOT}/blockchain/network/channel-artifacts/package.id"

approve() {
  local PEER=$1 MSP=$2 TLS=$3 MSPPATH=$4
  docker exec \
    -e CORE_PEER_ADDRESS="${PEER}" \
    -e CORE_PEER_LOCALMSPID="${MSP}" \
    -e CORE_PEER_TLS_ROOTCERT_FILE="${TLS}" \
    -e CORE_PEER_MSPCONFIGPATH="${MSPPATH}" \
    fabric-cli peer lifecycle chaincode approveformyorg \
      -o "${ORDERER}" --ordererTLSHostnameOverride orderer.foodchain.com \
      --channelID "${CHANNEL}" --name "${CC_NAME}" --version "${CC_VERSION}" \
      --package-id "${PACKAGE_ID}" --sequence "${CC_SEQUENCE}" \
      --tls --cafile "${ORDERER_CA}" \
      --signature-policy "OR('FarmOrgMSP.peer','ProcessorOrgMSP.peer','DistributorOrgMSP.peer','RetailOrgMSP.peer','AuditorOrgMSP.peer')"
}

approve "peer0.farm.foodchain.com:7051" FarmOrgMSP \
  "${BASE}/farm.foodchain.com/peers/peer0.farm.foodchain.com/tls/ca.crt" \
  "${BASE}/farm.foodchain.com/users/Admin@farm.foodchain.com/msp"
approve "peer0.processor.foodchain.com:9051" ProcessorOrgMSP \
  "${BASE}/processor.foodchain.com/peers/peer0.processor.foodchain.com/tls/ca.crt" \
  "${BASE}/processor.foodchain.com/users/Admin@processor.foodchain.com/msp"
approve "peer0.distributor.foodchain.com:11051" DistributorOrgMSP \
  "${BASE}/distributor.foodchain.com/peers/peer0.distributor.foodchain.com/tls/ca.crt" \
  "${BASE}/distributor.foodchain.com/users/Admin@distributor.foodchain.com/msp"
approve "peer0.retail.foodchain.com:13051" RetailOrgMSP \
  "${BASE}/retail.foodchain.com/peers/peer0.retail.foodchain.com/tls/ca.crt" \
  "${BASE}/retail.foodchain.com/users/Admin@retail.foodchain.com/msp"
approve "peer0.auditor.foodchain.com:15051" AuditorOrgMSP \
  "${BASE}/auditor.foodchain.com/peers/peer0.auditor.foodchain.com/tls/ca.crt" \
  "${BASE}/auditor.foodchain.com/users/Admin@auditor.foodchain.com/msp"

echo "==> Committing chaincode definition..."
docker exec \
  -e CORE_PEER_ADDRESS=peer0.farm.foodchain.com:7051 \
  -e CORE_PEER_LOCALMSPID=FarmOrgMSP \
  -e CORE_PEER_TLS_ROOTCERT_FILE="${BASE}/farm.foodchain.com/peers/peer0.farm.foodchain.com/tls/ca.crt" \
  -e CORE_PEER_MSPCONFIGPATH="${BASE}/farm.foodchain.com/users/Admin@farm.foodchain.com/msp" \
  fabric-cli peer lifecycle chaincode commit \
    -o "${ORDERER}" --ordererTLSHostnameOverride orderer.foodchain.com \
    --channelID "${CHANNEL}" --name "${CC_NAME}" --version "${CC_VERSION}" \
    --sequence "${CC_SEQUENCE}" \
    --tls --cafile "${ORDERER_CA}" \
    --peerAddresses peer0.farm.foodchain.com:7051 \
    --tlsRootCertFiles "${BASE}/farm.foodchain.com/peers/peer0.farm.foodchain.com/tls/ca.crt" \
    --peerAddresses peer0.processor.foodchain.com:9051 \
    --tlsRootCertFiles "${BASE}/processor.foodchain.com/peers/peer0.processor.foodchain.com/tls/ca.crt" \
    --peerAddresses peer0.distributor.foodchain.com:11051 \
    --tlsRootCertFiles "${BASE}/distributor.foodchain.com/peers/peer0.distributor.foodchain.com/tls/ca.crt" \
    --peerAddresses peer0.retail.foodchain.com:13051 \
    --tlsRootCertFiles "${BASE}/retail.foodchain.com/peers/peer0.retail.foodchain.com/tls/ca.crt" \
    --peerAddresses peer0.auditor.foodchain.com:15051 \
    --tlsRootCertFiles "${BASE}/auditor.foodchain.com/peers/peer0.auditor.foodchain.com/tls/ca.crt" \
    --signature-policy "OR('FarmOrgMSP.peer','ProcessorOrgMSP.peer','DistributorOrgMSP.peer','RetailOrgMSP.peer','AuditorOrgMSP.peer')"

echo "==> Initializing ledger..."
docker exec \
  -e CORE_PEER_ADDRESS=peer0.farm.foodchain.com:7051 \
  -e CORE_PEER_LOCALMSPID=FarmOrgMSP \
  -e CORE_PEER_TLS_ROOTCERT_FILE="${BASE}/farm.foodchain.com/peers/peer0.farm.foodchain.com/tls/ca.crt" \
  -e CORE_PEER_MSPCONFIGPATH="${BASE}/farm.foodchain.com/users/Admin@farm.foodchain.com/msp" \
  fabric-cli peer chaincode invoke \
    -o "${ORDERER}" --ordererTLSHostnameOverride orderer.foodchain.com \
    --tls --cafile "${ORDERER_CA}" \
    -C "${CHANNEL}" -n "${CC_NAME}" \
    --peerAddresses peer0.farm.foodchain.com:7051 \
    --tlsRootCertFiles "${BASE}/farm.foodchain.com/peers/peer0.farm.foodchain.com/tls/ca.crt" \
    -c '{"function":"InitLedger","Args":[]}'

echo "==> Chaincode ${CC_NAME} deployed"
