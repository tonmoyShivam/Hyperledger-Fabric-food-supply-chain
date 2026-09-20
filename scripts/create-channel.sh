#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NET="${ROOT}/blockchain/network"
CHANNEL=foodchannel
ORDERER=orderer.foodchain.com:7050
ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/foodchain.com/orderers/orderer.foodchain.com/msp/tlscacerts/tlsca.foodchain.com-cert.pem

echo "==> Creating channel ${CHANNEL}"

docker exec fabric-cli peer channel create \
  -o "${ORDERER}" \
  -c "${CHANNEL}" \
  -f ./channel-artifacts/foodchannel.tx \
  --outputBlock ./channel-artifacts/foodchannel.block \
  --tls --cafile "${ORDERER_CA}"

join_peer() {
  local PEER_ADDR=$1 MSP=$2 TLS_ROOT=$3 MSP_PATH=$4
  echo "==> Joining ${PEER_ADDR} (${MSP})"
  docker exec \
    -e CORE_PEER_ADDRESS="${PEER_ADDR}" \
    -e CORE_PEER_LOCALMSPID="${MSP}" \
    -e CORE_PEER_TLS_ROOTCERT_FILE="${TLS_ROOT}" \
    -e CORE_PEER_MSPCONFIGPATH="${MSP_PATH}" \
    fabric-cli peer channel join -b ./channel-artifacts/foodchannel.block
}

BASE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations

join_peer "peer0.farm.foodchain.com:7051" "FarmOrgMSP" \
  "${BASE}/farm.foodchain.com/peers/peer0.farm.foodchain.com/tls/ca.crt" \
  "${BASE}/farm.foodchain.com/users/Admin@farm.foodchain.com/msp"

join_peer "peer0.processor.foodchain.com:9051" "ProcessorOrgMSP" \
  "${BASE}/processor.foodchain.com/peers/peer0.processor.foodchain.com/tls/ca.crt" \
  "${BASE}/processor.foodchain.com/users/Admin@processor.foodchain.com/msp"

join_peer "peer0.distributor.foodchain.com:11051" "DistributorOrgMSP" \
  "${BASE}/distributor.foodchain.com/peers/peer0.distributor.foodchain.com/tls/ca.crt" \
  "${BASE}/distributor.foodchain.com/users/Admin@distributor.foodchain.com/msp"

join_peer "peer0.retail.foodchain.com:13051" "RetailOrgMSP" \
  "${BASE}/retail.foodchain.com/peers/peer0.retail.foodchain.com/tls/ca.crt" \
  "${BASE}/retail.foodchain.com/users/Admin@retail.foodchain.com/msp"

join_peer "peer0.auditor.foodchain.com:15051" "AuditorOrgMSP" \
  "${BASE}/auditor.foodchain.com/peers/peer0.auditor.foodchain.com/tls/ca.crt" \
  "${BASE}/auditor.foodchain.com/users/Admin@auditor.foodchain.com/msp"

echo "==> Channel ${CHANNEL} ready"
