/**
 * Hedera SDK wrapper for interacting with the HoldEscrow contract.
 *
 * Calls the deployed HoldEscrow.sol via the Hedera JSON-RPC relay so we can use
 * standard ethers.js patterns. The relay charges gas in HBAR automatically.
 */

import crypto from "node:crypto";
import {
  Client,
  ContractExecuteTransaction,
  ContractCallQuery,
  Hbar,
  AccountId,
  PrivateKey,
  ContractFunctionParameters,
  ContractId,
} from "@hiero-ledger/sdk";

// HoldEscrow ABI fragments we need
const HOLD_ESCROW_ABI = {
  open: "open(bytes32,address,uint64)",
  settle: "settle(bytes32)",
  refund: "refund(bytes32)",
  holdOf: "holdOf(bytes32)",
  stats: "stats()",
} as const;

let client: Client | null = null;
let operatorId: AccountId | null = null;
let operatorKey: PrivateKey | null = null;
let escrowContractId: ContractId | null = null;

/**
 * Initialize the Hedera client with operator credentials.
 * Returns false if HEDERA_OPERATOR_ID or HEDERA_OPERATOR_KEY is not set.
 */
export function initHederaClient(): boolean {
  const network = process.env["HEDERA_NETWORK"] ?? "testnet";
  const opId = process.env["HEDERA_OPERATOR_ID"];
  const opKey = process.env["HEDERA_OPERATOR_KEY"];
  const escrowAddress = process.env["HEDERA_ESCROW_ADDRESS"];

  if (!opId || !opKey) {
    console.log("[hedera] No operator credentials — contract calls disabled");
    return false;
  }

  try {
    operatorId = AccountId.fromString(opId);
    operatorKey = PrivateKey.fromStringECDSA(opKey);

    if (network === "mainnet") {
      client = Client.forMainnet();
    } else {
      client = Client.forTestnet();
    }
    client.setOperator(operatorId, operatorKey);

    if (escrowAddress) {
      // Convert EVM address to ContractId
      escrowContractId = ContractId.fromEvmAddress(0, 0, escrowAddress);
      console.log(`[hedera] Escrow contract: ${escrowContractId.toString()} (${escrowAddress})`);
    } else {
      console.log("[hedera] No HEDERA_ESCROW_ADDRESS — contract calls will fail");
    }

    console.log(`[hedera] Client initialized on ${network} as ${opId}`);
    return true;
  } catch (e) {
    console.error("[hedera] Failed to initialize client:", e);
    return false;
  }
}

export function isHederaReady(): boolean {
  return client !== null && escrowContractId !== null;
}

/**
 * Convert a Hedera AccountId to EVM address "long-zero" format.
 * Format: 12 zero bytes + 8 byte account number = 20 bytes
 */
function accountIdToEvmAddress(accountId: AccountId): string {
  const accountNum = accountId.num.toString(16).padStart(16, "0");
  return "0x" + "0".repeat(24) + accountNum;
}

export function getSellerEvmAddress(): string | null {
  if (!operatorId) return null;
  return accountIdToEvmAddress(operatorId);
}

/**
 * Hash the hold ID string to bytes32 for the contract.
 * The contract uses keccak256 of the seller's holdId so IDs stay opaque on-chain.
 */
function holdIdToBytes32(holdId: string): Uint8Array {
  const hash = crypto.createHash("sha256").update(holdId).digest();
  return hash;
}

export type OpenHoldResult = {
  success: boolean;
  transactionId: string | null;
  error?: string;
};

/**
 * Open a hold on the escrow contract.
 *
 * @param holdId - The off-chain hold ID (will be hashed for on-chain)
 * @param depositHbar - Deposit amount in HBAR
 * @param expiresAtMs - Expiration timestamp in milliseconds
 */
export async function openHoldOnContract(
  holdId: string,
  depositHbar: number,
  expiresAtMs: number
): Promise<OpenHoldResult> {
  if (!client || !escrowContractId || !operatorId) {
    return { success: false, transactionId: null, error: "Hedera client not initialized" };
  }

  try {
    const idBytes = holdIdToBytes32(holdId);
    const sellerAddress = accountIdToEvmAddress(operatorId);
    const expiresAtSec = Math.floor(expiresAtMs / 1000);

    const tx = new ContractExecuteTransaction()
      .setContractId(escrowContractId)
      .setGas(400_000) // Increased gas for Hedera's EVM relay
      .setPayableAmount(new Hbar(depositHbar))
      .setFunction(
        "open",
        new ContractFunctionParameters()
          .addBytes32(idBytes)
          .addAddress(sellerAddress)
          .addUint64(expiresAtSec)
      );

    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);

    if (receipt.status.toString() !== "SUCCESS") {
      return {
        success: false,
        transactionId: response.transactionId.toString(),
        error: `Contract call failed: ${receipt.status.toString()}`,
      };
    }

    return {
      success: true,
      transactionId: response.transactionId.toString(),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, transactionId: null, error: msg };
  }
}

export type SettleHoldResult = {
  success: boolean;
  transactionId: string | null;
  error?: string;
};

/**
 * Settle a hold — credit the deposit to the seller (called after booking).
 */
export async function settleHoldOnContract(holdId: string): Promise<SettleHoldResult> {
  if (!client || !escrowContractId) {
    return { success: false, transactionId: null, error: "Hedera client not initialized" };
  }

  try {
    const idBytes = holdIdToBytes32(holdId);

    const tx = new ContractExecuteTransaction()
      .setContractId(escrowContractId)
      .setGas(300_000) // Increased gas for Hedera's EVM relay
      .setFunction("settle", new ContractFunctionParameters().addBytes32(idBytes));

    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);

    if (receipt.status.toString() !== "SUCCESS") {
      return {
        success: false,
        transactionId: response.transactionId.toString(),
        error: `Settle failed: ${receipt.status.toString()}`,
      };
    }

    return {
      success: true,
      transactionId: response.transactionId.toString(),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, transactionId: null, error: msg };
  }
}

export type RefundHoldResult = {
  success: boolean;
  transactionId: string | null;
  error?: string;
};

/**
 * Refund a hold — return the deposit to the payer (release or expiry).
 */
export async function refundHoldOnContract(holdId: string): Promise<RefundHoldResult> {
  if (!client || !escrowContractId) {
    return { success: false, transactionId: null, error: "Hedera client not initialized" };
  }

  try {
    const idBytes = holdIdToBytes32(holdId);

    const tx = new ContractExecuteTransaction()
      .setContractId(escrowContractId)
      .setGas(300_000) // Increased gas for Hedera's EVM relay
      .setFunction("refund", new ContractFunctionParameters().addBytes32(idBytes));

    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);

    if (receipt.status.toString() !== "SUCCESS") {
      return {
        success: false,
        transactionId: response.transactionId.toString(),
        error: `Refund failed: ${receipt.status.toString()}`,
      };
    }

    return {
      success: true,
      transactionId: response.transactionId.toString(),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, transactionId: null, error: msg };
  }
}

export type ContractStats = {
  locked: string;
  settled: string;
  refunded: string;
  opened: number;
};

/**
 * Query the contract's aggregate stats.
 */
export async function getContractStats(): Promise<ContractStats | null> {
  if (!client || !escrowContractId) {
    return null;
  }

  try {
    const query = new ContractCallQuery()
      .setContractId(escrowContractId)
      .setGas(50_000)
      .setFunction("stats");

    const result = await query.execute(client);

    // SDK returns BigNumber objects, convert to string/number for downstream use
    return {
      locked: result.getUint256(0).toString(),
      settled: result.getUint256(1).toString(),
      refunded: result.getUint256(2).toString(),
      opened: result.getUint64(3).toNumber(),
    };
  } catch (e) {
    console.error("[hedera] Failed to get contract stats:", e);
    return null;
  }
}

/**
 * Convert USD amount to HBAR using a simple fixed rate.
 * In production, this would use an oracle or price feed.
 */
export function usdToHbar(usd: number): number {
  // Approximate HBAR price: ~$0.05 USD
  // So $1 USD = 20 HBAR
  const hbarPrice = parseFloat(process.env["HBAR_USD_PRICE"] ?? "0.05");
  return Math.ceil((usd / hbarPrice) * 100) / 100; // Round up to 2 decimals
}

/**
 * Convert HBAR amount to tinybars (1 HBAR = 100,000,000 tinybars).
 */
export function hbarToTinybars(hbar: number): string {
  return String(Math.round(hbar * 100_000_000));
}
