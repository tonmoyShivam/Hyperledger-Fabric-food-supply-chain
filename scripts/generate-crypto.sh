#!/usr/bin/env bash
set -euo pipefail
cd "/mnt/f/Case Study/food-supply-chain"
FABRIC_VERSION="${FABRIC_VERSION:-2.5.16}"
NET="blockchain/network"
mkdir -p "${NET}/bin" "${NET}/channel-artifacts"

if [[ ! -x "${NET}/bin/cryptogen" ]]; then
  echo "Downloading Fabric ${FABRIC_VERSION} binaries..."
  TMP="$(mktemp -d)"
  curl -fsSL "https://github.com/hyperledger/fabric/releases/download/v${FABRIC_VERSION}/hyperledger-fabric-linux-amd64-${FABRIC_VERSION}.tar.gz" \
    -o "${TMP}/fabric.tar.gz"
  tar -xzf "${TMP}/fabric.tar.gz" -C "${TMP}"
  cp "${TMP}/bin/"* "${NET}/bin/"
  chmod +x "${NET}/bin/"*
  rm -rf "${TMP}"
fi

export PATH="${PWD}/${NET}/bin:${PATH}"
export FABRIC_CFG_PATH="${PWD}/${NET}/configtx"

echo "Generating crypto..."
rm -rf "${NET}/organizations"
cryptogen generate --config="${NET}/crypto-config.yaml" --output="${NET}/organizations"

echo "Generating genesis + channel tx..."
rm -f "${NET}/channel-artifacts/"*
configtxgen -profile FoodOrdererGenesis -channelID system-channel -outputBlock "${NET}/channel-artifacts/genesis.block"
configtxgen -profile FoodChannel -outputCreateChannelTx "${NET}/channel-artifacts/foodchannel.tx" -channelID foodchannel

echo "CRYPTO_OK"
ls "${NET}/organizations/peerOrganizations"
ls -la "${NET}/channel-artifacts"
