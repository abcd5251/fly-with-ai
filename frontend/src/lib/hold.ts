import { requestHoldOnChain, releaseHoldOnChain, settleHoldOnChain } from "./api";
import type { Trip } from "./trip";

/**
 * A seat hold is a short-lived option the agent buys on real inventory.
 *
 * Two very different pieces of money are involved:
 *   fee     — small, non-refundable, paid straight through x402. It compensates
 *             the seller for taking the seat off the market.
 *   deposit — larger, refundable, locked in escrow. It is credited to the
 *             booking, or returned when the hold is released or expires.
 */
export type HoldStatus = "held" | "released" | "expired" | "booked";

/** "onchain" once the seller exposes POST /holds; "simulated" until then. */
export type HoldMode = "onchain" | "simulated";

export type HoldPayment = {
  totalUsd: number;
  totalHbar: number;
  feeUsd: number;
  depositUsd: number;
};

export type Hold = {
  id: string;
  flightId: string;
  fareIndex: number;
  passengers: number;
  /** Price per person the hold locks in. */
  priceLocked: number;
  fee: number;
  deposit: number;
  /** Payment info: total paid via x402 (fee + deposit) */
  payment?: HoldPayment;
  escrow: string;
  feeTx: string;
  depositTx: string;
  refundTx?: string;
  createdAt: number;
  expiresAt: number;
  status: HoldStatus;
  mode: HoldMode;
  /** Error message if contract call failed (hold still works in simulated mode) */
  contractError?: string;
  /** Error message if the hold request failed (e.g., 402 payment required) */
  requestError?: string;
};

export const holdWindows = [6, 24] as const;

export const ESCROW_ADDRESS = "0x4021F9c3B7a8E5d0C1b6A9e8F7d6C5b4A3928170";

/**
 * For testing: use small fixed amounts that fit within 20 HBAR (~$1 at $0.05/HBAR)
 * Fee: $0.20 (non-refundable)
 * Deposit: $0.80 (refundable)
 * Total: $1.00 = 20 HBAR
 */
export function holdQuote(_fareTotal: number, _hours: number) {
  const fee = 0.20;
  const deposit = 0.80;
  return { fee, deposit };
}

/** The spending policy the user set on step 01 — a hard gate before any payment. */
export function policyCheck(quote: { fee: number; deposit: number }, trip: Trip) {
  if (!trip.autoHold) return { ok: false, reason: "auto-hold is off" } as const;
  if (quote.fee > trip.maxHoldFee)
    return {
      ok: false,
      reason: `fee ${usd(quote.fee)} over your ${usd(trip.maxHoldFee)} cap`,
    } as const;
  if (quote.deposit > trip.maxDeposit)
    return {
      ok: false,
      reason: `deposit ${usd(quote.deposit)} over your ${usd(trip.maxDeposit)} cap`,
    } as const;
  return { ok: true, reason: "" } as const;
}

function usd(n: number) {
  return `$${n.toFixed(2)}`;
}

const hex = (n: number) =>
  Array.from({ length: n }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");

const localTx = () => `0x${hex(40)}`;

export async function placeHold(input: {
  trip: Trip;
  flightId: string;
  fareIndex: number;
  priceLocked: number;
  hours: number;
}): Promise<Hold> {
  const { trip, flightId, fareIndex, priceLocked, hours } = input;
  const quote = holdQuote(priceLocked * trip.passengers, hours);
  const now = Date.now();

  console.log("[placeHold] Starting hold placement...");
  console.log("[placeHold] Flight:", flightId, "Fare:", fareIndex, "Passengers:", trip.passengers);
  console.log("[placeHold] Quote:", quote, "Price locked:", priceLocked, "Hours:", hours);

  const result = await requestHoldOnChain({
    flightId,
    fareIndex,
    passengers: trip.passengers,
    hours,
    email: trip.email,
  });

  const onChain = result.ok ? result.data : null;
  const requestError = result.ok ? undefined : result.error;

  if (result.ok) {
    console.log("[placeHold] On-chain response received");
    console.log("[placeHold] Chain:", result.data.chain);
    console.log("[placeHold] Hold ID:", result.data.holdId);
    console.log("[placeHold] Payment info:", result.data.payment);
    if (result.data.contractError) {
      console.warn("[placeHold] Contract error:", result.data.contractError);
    }
  } else {
    console.error("[placeHold] Request failed:", result.error);
    console.log("[placeHold] Falling back to simulated mode");
  }

  // Determine mode: "onchain" if we got a response and chain is not "simulated"
  const isOnChain = onChain && onChain.chain !== "simulated";

  const hold: Hold = {
    id: onChain?.holdId ?? `h_${hex(6)}`,
    flightId,
    fareIndex,
    passengers: trip.passengers,
    priceLocked,
    fee: onChain?.fee ?? quote.fee,
    deposit: onChain?.deposit ?? quote.deposit,
    // Payment info from x402 (fee + deposit paid together)
    ...(onChain?.payment
      ? {
          payment: {
            totalUsd: onChain.payment.totalUsd,
            totalHbar: onChain.payment.totalHbar,
            feeUsd: onChain.payment.feeUsd,
            depositUsd: onChain.payment.depositUsd,
          },
        }
      : {}),
    escrow: onChain?.escrow ?? ESCROW_ADDRESS,
    feeTx: onChain?.feeTx ?? localTx(),
    depositTx: onChain?.depositTx ?? localTx(),
    createdAt: now,
    expiresAt: onChain ? Date.parse(onChain.expiresAt) : now + hours * 3_600_000,
    status: "held",
    mode: isOnChain ? "onchain" : "simulated",
    ...(onChain?.contractError ? { contractError: onChain.contractError } : {}),
    ...(requestError ? { requestError } : {}),
  };

  saveHold(hold);
  return hold;
}

export async function releaseHold(hold: Hold): Promise<Hold> {
  const onChain = hold.mode === "onchain" ? await releaseHoldOnChain(hold.id) : null;
  const next: Hold = {
    ...hold,
    status: "released",
    refundTx: onChain?.refundTx ?? localTx(),
  };
  saveHold(next);
  return next;
}

export function expireHold(hold: Hold): Hold {
  const next: Hold = { ...hold, status: "expired", refundTx: hold.refundTx ?? localTx() };
  saveHold(next);
  return next;
}

export function markBooked(hold: Hold): Hold {
  const next: Hold = { ...hold, status: "booked" };
  saveHold(next);
  // the deposit leaves escrow for the seller — fire and forget
  if (hold.mode === "onchain") void settleHoldOnChain(hold.id);
  return next;
}

/** True while the seat is actually off the market for this user. */
export function isActive(hold: Hold | null, now: number): hold is Hold {
  return !!hold && hold.status === "held" && hold.expiresAt > now;
}

/** A hold is bought on a seat, so it follows the flight — not the fare family. */
export function coversFlight(hold: Hold | null, flightId: string) {
  return !!hold && hold.flightId === flightId;
}

export function fmtCountdown(ms: number) {
  if (ms <= 0) return "00m 00s";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}h ${pad(m)}m ${pad(s)}s` : `${pad(m)}m ${pad(s)}s`;
}

export function shortTx(tx: string) {
  return `${tx.slice(0, 8)}…${tx.slice(-6)}`;
}

const KEY = "x402-hold";

export function saveHold(hold: Hold | null) {
  if (typeof window === "undefined") return;
  if (!hold) {
    window.sessionStorage.removeItem(KEY);
    return;
  }
  window.sessionStorage.setItem(KEY, JSON.stringify(hold));
}

export function loadHold(): Hold | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Hold) : null;
  } catch {
    return null;
  }
}
