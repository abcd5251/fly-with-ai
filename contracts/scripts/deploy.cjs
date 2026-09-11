const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  console.log(`Deploying HoldEscrow to ${network} as ${deployer.address}`);

  const factory = await hre.ethers.getContractFactory("HoldEscrow");
  const escrow = await factory.deploy();
  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log(`\nHoldEscrow deployed: ${address}`);

  if (network.startsWith("hedera")) {
    const net = network === "hederaMainnet" ? "mainnet" : "testnet";
    console.log(`HashScan: https://hashscan.io/${net}/contract/${address}`);
  }
  console.log(`\nAdd to backend/seller/.env:\n  HEDERA_ESCROW_ADDRESS=${address}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
