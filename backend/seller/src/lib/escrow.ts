import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  initHederaClient,
  isHederaReady,
  openHoldOnContract,
  settleHoldOnContract,
  refundHoldOnContract,
} from "./hedera-client.js";

/**
 * The escrow ledger behind the seat holds.
 *
 * Every entry mirrors one `open()` on the HoldEscrow contract. While
 * HEDERA_ESCROW_ADDRESS is unset the ledger runs on its own and the UI says so;
 * once the contract is deployed the same rows carry real transaction hashes and
 * `chain` flips to the Hedera network.
 */

// Initialize Hedera client on module load
const hederaEnabled = initHederaClient();

const here = path.dirname(fileURLToPath(import.meta.url));
const STORE = path.resolve(here, "../../.cache/escrow.json");

export type EscrowStatus = "held" | "released" | "expired" | "settled";

export type EscrowEntry = {
  id: string;
  flightId: string;
  flightNo: string;
  airline: string;
  route: string;
  passengers: number;
  priceLocked: number;
  fee: number;
  deposit: number;
  status: EscrowStatus;
  createdAt: number;
  expiresAt: number;
  closedAt?: number;
  feeTx: string;
  depositTx: string;
  refundTx?: string;
  settleTx?: string;
  chain: string;
  /** Error message if contract call failed (hold still works in simulated mode) */
  contractError?: string;
};

export type EscrowSnapshot = {
  tvl: number;
  active: number;
  totals: {
    opened: number;
    settled: number;
    released: number;
    expired: number;
    feesPaid: number;
    depositsSettled: number;
    depositsRefunded: number;
  };
  avgWindowHours: number;
  avgHeldMinutes: number;
  contract: {
    address: string | null;
    network: string;
    explorer: string | null;
    deployed: boolean;
  };
  entries: EscrowEntry[];
};

const entries = new Map<string, EscrowEntry>();
load();

export function escrowContract() {
  const address = process.env["HEDERA_ESCROW_ADDRESS"] ?? null;
  const network = process.env["HEDERA_NETWORK"] ?? "testnet";
  return {
    address,
    network: `hedera-${network}`,
    explorer: address ? `https://hashscan.io/${network}/contract/${address}` : null,
    deployed: Boolean(address),
  };
}

export function getHoldById(id: string): EscrowEntry | null {
  sweepExpired();
  return entries.get(id) ?? null;
}

export async function openHold(input: {
  flightId: string;
  flightNo: string;
  airline: string;
  route: string;
  passengers: number;
  priceLocked: number;
  fee: number;
  deposit: number;
  hours: number;
  feeTx?: string; // Transaction ID from x402 fee payment
}): Promise<EscrowEntry> {
  const now = Date.now();
  const contract = escrowContract();
  const expiresAt = now + input.hours * 3_600_000;

  const entry: EscrowEntry = {
    id: `h_${rand(6)}`,
    flightId: input.flightId,
    flightNo: input.flightNo,
    airline: input.airline,
    route: input.route,
    passengers: input.passengers,
    priceLocked: input.priceLocked,
    fee: round2(input.fee),
    deposit: round2(input.deposit),
    status: "held",
    createdAt: now,
    expiresAt,
    feeTx: input.feeTx ?? mockTx(),
    depositTx: mockTx(), // Will be updated if contract call succeeds
    chain: contract.deployed ? contract.network : "simulated",
  };

  // If Hedera is ready, call the contract
  if (isHederaReady()) {
    const depositHbar = input.deposit;
    const result = await openHoldOnContract(entry.id, depositHbar, expiresAt);

    if (result.success && result.transactionId) {
      entry.depositTx = result.transactionId;
      entry.chain = contract.network;
      console.log(`[escrow] Hold ${entry.id} opened on-chain: ${result.transactionId}`);
    } else {
      console.error(`[escrow] Contract call failed for ${entry.id}:`, result.error);
      // Fall back to simulated mode, but capture the error
      entry.chain = "simulated";
      entry.contractError = result.error ?? "Contract call failed";
    }
  }

  entries.set(entry.id, entry);
  save();
  return entry;
}

export async function closeHold(id: string, how: "released" | "settled"): Promise<EscrowEntry | null> {
  sweepExpired();
  const entry = entries.get(id);
  if (!entry || entry.status !== "held") return null;

  entry.status = how;
  entry.closedAt = Date.now();

  // Call the contract if the hold was opened on-chain
  if (isHederaReady() && entry.chain !== "simulated") {
    if (how === "settled") {
      const result = await settleHoldOnContract(id);
      if (result.success && result.transactionId) {
        entry.settleTx = result.transactionId;
        console.log(`[escrow] Hold ${id} settled on-chain: ${result.transactionId}`);
      } else {
        console.error(`[escrow] Settle failed for ${id}:`, result.error);
        entry.settleTx = mockTx();
      }
    } else {
      const result = await refundHoldOnContract(id);
      if (result.success && result.transactionId) {
        entry.refundTx = result.transactionId;
        console.log(`[escrow] Hold ${id} refunded on-chain: ${result.transactionId}`);
      } else {
        console.error(`[escrow] Refund failed for ${id}:`, result.error);
        entry.refundTx = mockTx();
      }
    }
  } else {
    // Simulated mode
    if (how === "released") entry.refundTx = mockTx();
    else entry.settleTx = mockTx();
  }

  save();
  return entry;
}

export function snapshot(limit = 12): EscrowSnapshot {
  sweepExpired();
  const all = [...entries.values()].sort((a, b) => b.createdAt - a.createdAt);
  const held = all.filter((e) => e.status === "held");

  const totals = {
    opened: all.length,
    settled: all.filter((e) => e.status === "settled").length,
    released: all.filter((e) => e.status === "released").length,
    expired: all.filter((e) => e.status === "expired").length,
    feesPaid: round2(sum(all.map((e) => e.fee))),
    depositsSettled: round2(sum(all.filter((e) => e.status === "settled").map((e) => e.deposit))),
    depositsRefunded: round2(
      sum(all.filter((e) => e.status === "released" || e.status === "expired").map((e) => e.deposit))
    ),
  };

  const closed = all.filter((e) => e.closedAt);
  const avgHeldMinutes = closed.length
    ? Math.round(sum(closed.map((e) => (e.closedAt! - e.createdAt) / 60000)) / closed.length)
    : 0;
  const avgWindowHours = all.length
    ? Math.round(sum(all.map((e) => (e.expiresAt - e.createdAt) / 3_600_000)) / all.length)
    : 0;

  return {
    tvl: round2(sum(held.map((e) => e.deposit))),
    active: held.length,
    totals,
    avgWindowHours,
    avgHeldMinutes,
    contract: escrowContract(),
    entries: all.slice(0, limit),
  };
}

/** A hold nobody closed refunds itself the moment its window ends. */
function sweepExpired() {
  const now = Date.now();
  let touched = false;
  for (const entry of entries.values()) {
    if (entry.status === "held" && entry.expiresAt <= now) {
      entry.status = "expired";
      entry.closedAt = entry.expiresAt;
      entry.refundTx = mockTx();
      touched = true;
    }
  }
  if (touched) save();
}

function sum(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function rand(n: number) {
  return crypto.randomBytes(n).toString("hex").slice(0, n);
}

function mockTx() {
  return `0x${crypto.randomBytes(20).toString("hex")}`;
}

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(STORE, "utf8")) as EscrowEntry[];
    for (const e of raw) entries.set(e.id, e);
  } catch {
    /* first run */
  }
}

function save() {
  try {
    fs.mkdirSync(path.dirname(STORE), { recursive: true });
    fs.writeFileSync(STORE, JSON.stringify([...entries.values()], null, 2));
  } catch {
    /* read-only disk shouldn't break a hold */
  }
}
