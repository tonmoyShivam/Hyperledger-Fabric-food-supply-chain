# Food Traceability — Polygon Amoy

EVM port of the Fabric `foodtrace` chaincode, deployed to **Polygon Amoy** (chain ID `80002`).

## Prerequisites

1. Node.js 18+
2. A wallet private key with Amoy test POL  
   Faucet: https://faucet.polygon.technology/
3. Copy env file and set your key:

```bash
cd polygon-amoy
cp .env.example .env
# edit .env → PRIVATE_KEY=0x...
```

## Install & deploy

```bash
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network amoy
```

Deployment address is saved to `deployments/amoy.json`.

## Contract API

| Function | Who |
|---|---|
| `registerBatch` | FARM |
| `addSupplyChainEvent` | PROCESSOR / DISTRIBUTOR / STORE_ADMIN |
| `flagContamination` | STORE_ADMIN |
| `assignRole` | owner |
| `getBatch` / `getBatchHistory` / `verifyIntegrity` | anyone |

Deployer starts as **FARM** (owner). The deploy script also grants **STORE_ADMIN** to the deployer for end-to-end demos.

## Verify on Polygonscan (optional)

```bash
npx hardhat verify --network amoy <CONTRACT_ADDRESS>
```
