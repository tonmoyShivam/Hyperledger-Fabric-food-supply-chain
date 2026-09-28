const { expect } = require("chai");
const hre = require("hardhat");

describe("FoodTraceability", function () {
  async function deploy() {
    const [farm, processor, store] = await hre.ethers.getSigners();
    const Factory = await hre.ethers.getContractFactory("FoodTraceability");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();
    await (await contract.assignRole(processor.address, 2)).wait(); // PROCESSOR
    await (await contract.assignRole(store.address, 4)).wait(); // STORE_ADMIN
    // farm (owner) already has FARM|STORE_ADMIN from constructor
    return { contract, farm, processor, store };
  }

  it("registers a batch and flags contamination", async function () {
    const { contract, farm, processor, store } = await deploy();

    await (
      await contract
        .connect(farm)
        .registerBatch("MG204", "Organic Mangoes", "farm@foodchain.local", "Chennai", '{"variety":"Alphonso"}')
    ).wait();

    const batch = await contract.getBatch("MG204");
    expect(batch.product).to.equal("Organic Mangoes");
    expect(batch.status).to.equal(0n); // SAFE

    await (
      await contract
        .connect(processor)
        .addSupplyChainEvent("MG204", 1, "processor@foodchain.local", "Pune Plant", '{"notes":"washed"}')
    ).wait();

    await (
      await contract.connect(store).flagContamination("MG204", "Salmonella detected", "HIGH")
    ).wait();

    const contaminated = await contract.getBatch("MG204");
    expect(contaminated.status).to.equal(1n); // CONTAMINATED
    expect(contaminated.contaminationReason).to.equal("Salmonella detected");

    const [valid] = await contract.verifyIntegrity("MG204");
    expect(valid).to.equal(true);
  });
});
