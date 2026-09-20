# Fabric network

Hyperledger Fabric **2.5.16** multi-organization network for food traceability.

## Start

From repo root (WSL):

```bash
../../scripts/setup-network.sh
../../scripts/create-channel.sh
../../scripts/deploy-chaincode.sh
```

Crypto material is generated into `organizations/` (gitignored).

## Containers

- `orderer.foodchain.com`
- `peer0.{farm,processor,distributor,retail,auditor}.foodchain.com`
- CouchDB per peer
- `fabric-cli` (tools)

## Channel

`foodchannel` — all five peer orgs join.
