const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer account. Set PRIVATE_KEY in polygon-amoy/.env");
  }

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Network:", hre.network.name, "chainId:", (await hre.ethers.provider.getNetwork()).chainId.toString());
  console.log("Deployer:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "POL");

  if (balance === 0n) {
    throw new Error(
      "Deployer has 0 POL. Fund Amoy testnet POL from https://faucet.polygon.technology/"
    );
  }

  const Factory = await hre.ethers.getContractFactory("FoodTraceability");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const deployTx = contract.deploymentTransaction();

  console.log("FoodTraceability deployed to:", address);
  if (deployTx) {
    console.log("Deploy tx:", deployTx.hash);
    console.log("Explorer:", `https://amoy.polygonscan.com/address/${address}`);
  }

  console.log("Deployer roles: FARM + STORE_ADMIN (bitmask)");

  const out = {
    network: hre.network.name,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    address,
    deployer: deployer.address,
    deployTxHash: deployTx ? deployTx.hash : null,
    deployedAt: new Date().toISOString(),
    explorer: `https://amoy.polygonscan.com/address/${address}`,
  };

  const outPath = path.join(__dirname, "..", "deployments", "amoy.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log("Wrote", outPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
