/**
 * Every amount the buyer is ever charged, in one place.
 *
 * Prices are denominated in HBAR — that is the unit that actually leaves the
 * buyer's account — and deliberately kept tiny so a testnet wallet can run the
 * whole flow many times over.
 */

/** Charged on POST /booking to confirm a seat. */
export const BOOKING_HBAR = 50;

/** Non-refundable slice of a seat hold. Stays with the seller. */
export const HOLD_FEE_HBAR = 1;

/** Refundable slice of a seat hold. Forwarded to the HoldEscrow contract. */
export const HOLD_DEPOSIT_HBAR = 4;

/** What x402 collects up front for a hold: fee + deposit. */
export const HOLD_TOTAL_HBAR = HOLD_FEE_HBAR + HOLD_DEPOSIT_HBAR;

/** 1 HBAR = 100,000,000 tinybars — the unit x402 price quotes use. */
export function hbarToTinybars(hbar: number): string {
  return String(Math.round(hbar * 100_000_000));
}
