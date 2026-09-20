#!/usr/bin/env bash
# Seed demo batches via REAL chaincode invokes (not CouchDB writes)
set -euo pipefail

CHANNEL=foodchannel
CC_NAME=foodtrace
ORDERER=orderer.foodchain.com:7050
ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/foodchain.com/orderers/orderer.foodchain.com/msp/tlscacerts/tlsca.foodchain.com-cert.pem
BASE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations

invoke() {
  local PEER=$1 MSP=$2 TLS=$3 MSPPATH=$4 FUNC=$5 ARGS=$6
  echo "--> ${MSP}: ${FUNC}"
  docker exec \
    -e CORE_PEER_ADDRESS="${PEER}" \
    -e CORE_PEER_LOCALMSPID="${MSP}" \
    -e CORE_PEER_TLS_ROOTCERT_FILE="${TLS}" \
    -e CORE_PEER_MSPCONFIGPATH="${MSPPATH}" \
    fabric-cli peer chaincode invoke \
      -o "${ORDERER}" --ordererTLSHostnameOverride orderer.foodchain.com \
      --tls --cafile "${ORDERER_CA}" \
      -C "${CHANNEL}" -n "${CC_NAME}" \
      --peerAddresses "${PEER}" \
      --tlsRootCertFiles "${TLS}" \
      -c "{\"function\":\"${FUNC}\",\"Args\":${ARGS}}" \
      --waitForEvent
  sleep 2
}

FARM_PEER=peer0.farm.foodchain.com:7051
FARM_TLS="${BASE}/farm.foodchain.com/peers/peer0.farm.foodchain.com/tls/ca.crt"
FARM_MSP="${BASE}/farm.foodchain.com/users/Admin@farm.foodchain.com/msp"

PROC_PEER=peer0.processor.foodchain.com:9051
PROC_TLS="${BASE}/processor.foodchain.com/peers/peer0.processor.foodchain.com/tls/ca.crt"
PROC_MSP="${BASE}/processor.foodchain.com/users/Admin@processor.foodchain.com/msp"

DIST_PEER=peer0.distributor.foodchain.com:11051
DIST_TLS="${BASE}/distributor.foodchain.com/peers/peer0.distributor.foodchain.com/tls/ca.crt"
DIST_MSP="${BASE}/distributor.foodchain.com/users/Admin@distributor.foodchain.com/msp"

RET_PEER=peer0.retail.foodchain.com:13051
RET_TLS="${BASE}/retail.foodchain.com/peers/peer0.retail.foodchain.com/tls/ca.crt"
RET_MSP="${BASE}/retail.foodchain.com/users/Admin@retail.foodchain.com/msp"

echo "==> Seeding MNG1024 (will be contaminated)"
invoke "$FARM_PEER" FarmOrgMSP "$FARM_TLS" "$FARM_MSP" registerBatch \
  '["MNG1024","Fresh Mangoes","Green Valley Farms","Andhra Pradesh, India","{\"notes\":\"Alphonso Grade A\"}"]'
invoke "$PROC_PEER" ProcessorOrgMSP "$PROC_TLS" "$PROC_MSP" addSupplyChainEvent \
  '["MNG1024","PROCESSOR","FreshPack Processing","Hyderabad, India","{\"notes\":\"Washed and packed\"}"]'
invoke "$DIST_PEER" DistributorOrgMSP "$DIST_TLS" "$DIST_MSP" addSupplyChainEvent \
  '["MNG1024","DISTRIBUTOR","ABC Distribution","Chennai Logistics Hub","{\"notes\":\"Cold chain\"}"]'
invoke "$RET_PEER" RetailOrgMSP "$RET_TLS" "$RET_MSP" addSupplyChainEvent \
  '["MNG1024","WALMART_STORE","Walmart Chennai","Chennai, Tamil Nadu","{\"notes\":\"On shelf\"}"]'
invoke "$RET_PEER" RetailOrgMSP "$RET_TLS" "$RET_MSP" addSupplyChainEvent \
  '["MNG1024","WALMART_STORE","Walmart Bangalore","Bangalore, Karnataka","{\"notes\":\"Secondary allocation\"}"]'
invoke "$RET_PEER" RetailOrgMSP "$RET_TLS" "$RET_MSP" addSupplyChainEvent \
  '["MNG1024","CUSTOMER_SALE","POS Terminal — Walmart Chennai","Chennai, Tamil Nadu","{\"notes\":\"Sold\"}"]'
invoke "$RET_PEER" RetailOrgMSP "$RET_TLS" "$RET_MSP" flagContamination \
  '["MNG1024","Possible Salmonella contamination","Detected during QA sampling"]'

echo "==> Seeding APL2048"
invoke "$FARM_PEER" FarmOrgMSP "$FARM_TLS" "$FARM_MSP" registerBatch \
  '["APL2048","Organic Apples","Himalayan Orchards","Shimla, Himachal Pradesh","{\"notes\":\"Organic Fuji\"}"]'
invoke "$PROC_PEER" ProcessorOrgMSP "$PROC_TLS" "$PROC_MSP" addSupplyChainEvent \
  '["APL2048","PROCESSOR","Mountain Fresh Packers","Chandigarh","{}"]'
invoke "$DIST_PEER" DistributorOrgMSP "$DIST_TLS" "$DIST_MSP" addSupplyChainEvent \
  '["APL2048","DISTRIBUTOR","NorthLine Logistics","Delhi NCR","{}"]'
invoke "$RET_PEER" RetailOrgMSP "$RET_TLS" "$RET_MSP" addSupplyChainEvent \
  '["APL2048","WALMART_STORE","Walmart Gurugram","Gurugram, Haryana","{}"]'

echo "==> Seeding RCE3012"
invoke "$FARM_PEER" FarmOrgMSP "$FARM_TLS" "$FARM_MSP" registerBatch \
  '["RCE3012","Basmati Rice","Punjab Agro Farms","Amritsar, Punjab","{}"]'
invoke "$PROC_PEER" ProcessorOrgMSP "$PROC_TLS" "$PROC_MSP" addSupplyChainEvent \
  '["RCE3012","PROCESSOR","Golden Grain Mills","Ludhiana","{}"]'
invoke "$DIST_PEER" DistributorOrgMSP "$DIST_TLS" "$DIST_MSP" addSupplyChainEvent \
  '["RCE3012","DISTRIBUTOR","GrainBridge Distributors","Mumbai","{}"]'
invoke "$RET_PEER" RetailOrgMSP "$RET_TLS" "$RET_MSP" addSupplyChainEvent \
  '["RCE3012","WALMART_STORE","Walmart Mumbai","Mumbai","{}"]'
invoke "$RET_PEER" RetailOrgMSP "$RET_TLS" "$RET_MSP" addSupplyChainEvent \
  '["RCE3012","CUSTOMER_SALE","POS Terminal — Walmart Mumbai","Mumbai","{}"]'

echo "==> Seeding TMT4096"
invoke "$FARM_PEER" FarmOrgMSP "$FARM_TLS" "$FARM_MSP" registerBatch \
  '["TMT4096","Fresh Tomatoes","South Valley Farms","Nashik, Maharashtra","{}"]'
invoke "$PROC_PEER" ProcessorOrgMSP "$PROC_TLS" "$PROC_MSP" addSupplyChainEvent \
  '["TMT4096","PROCESSOR","VitaProduce Processing","Nashik","{}"]'
invoke "$DIST_PEER" DistributorOrgMSP "$DIST_TLS" "$DIST_MSP" addSupplyChainEvent \
  '["TMT4096","DISTRIBUTOR","FreshRoute Distributors","Pune","{}"]'
invoke "$RET_PEER" RetailOrgMSP "$RET_TLS" "$RET_MSP" addSupplyChainEvent \
  '["TMT4096","WALMART_STORE","Walmart Pune","Pune","{}"]'

echo "==> Seed complete (Fabric transactions)"
