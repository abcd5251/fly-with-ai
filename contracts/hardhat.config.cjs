require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** Hedera exposes an EVM through the JSON-RPC relay, so this is a normal deploy. */
module.exports = {
  paths: { sources: "./src" },
  solidity: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: {
    hederaTestnet: {
      url: process.env.HEDERA_RPC_URL || "https://testnet.hashio.io/api",
      chainId: 296,
      accounts: process.env.HEDERA_OPERATOR_KEY ? [process.env.HEDERA_OPERATOR_KEY] : [],
      // the relay prices gas in weibar; a generous limit avoids INSUFFICIENT_GAS
      gas: 3_000_000,
    },
    hederaMainnet: {
      url: process.env.HEDERA_RPC_URL || "https://mainnet.hashio.io/api",
      chainId: 295,
      accounts: process.env.HEDERA_OPERATOR_KEY ? [process.env.HEDERA_OPERATOR_KEY] : [],
      gas: 3_000_000,
    },
    baseSepolia: {
      url: process.env.BASE_RPC_URL || "https://sepolia.base.org",
      chainId: 84532,
      accounts: process.env.HEDERA_OPERATOR_KEY ? [process.env.HEDERA_OPERATOR_KEY] : [],
    },
  },
};
