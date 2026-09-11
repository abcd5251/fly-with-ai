import { getX402Fetch } from "./x402-client";
import type { Flight, ReturnLeg } from "./trip";

const API_URL = import.meta.env["VITE_API_URL"] || "http://localhost:4021";

export type FlightSummary = {
  id: string;
  airline: string;
  flightNo: string;
  fromCode: string;
  toCode: string;
  departTime: string;
  arriveTime: string;
  duration: string;
  stops: number;
  price: number;
  seatsLeft: number;
  tag?: string;
};

export type BookingConfirmation = {
  code: string;
  flightNo: string;
  airline: string;
  fare: string;
  passengers: number;
  total: number;
  email: string;
  bookedAt: string;
};

export type BookingResponse = {
  confirmation: BookingConfirmation;
  message: string;
};

export async function searchFlights(): Promise<FlightSummary[]> {
  const res = await fetch(`${API_URL}/flights/search`);
  if (!res.ok) {
    throw new Error(`Failed to search flights: ${res.statusText}`);
  }
  const data = await res.json();
  return data.flights;
}

export async function getFlightDetails(
  id: string,
): Promise<{ flight: Flight; returnLeg: ReturnLeg }> {
  const res = await fetch(`${API_URL}/flights/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to get flight details: ${res.statusText}`);
  }
  return res.json();
}

export type BookingData = {
  flightId: string;
  fareIndex: number;
  passengers: number;
  email: string;
};

export async function confirmBooking(data: BookingData): Promise<BookingResponse> {
  const x402Fetch = getX402Fetch();

  const res = await x402Fetch(`${API_URL}/booking`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Booking failed: ${errorText || res.statusText}`);
  }

  return res.json();
}

/* ---------------------------------------------------------------------------
 * Seat holds — the agent buys a short-lived option on the seat.
 *
 * These call the seller the moment it exposes POST /holds. Until then every
 * helper resolves to null and the caller falls back to a local hold, so the
 * product flow runs end to end either way.
 * ------------------------------------------------------------------------- */

export type HoldRequest = {
  flightId: string;
  fareIndex: number;
  passengers: number;
  hours: number;
  email: string;
};

export type HoldResponse = {
  holdId: string;
  expiresAt: string;
  fee: number;
  deposit: number;
  escrow: string;
  feeTx: string;
  depositTx: string;
  chain: string;
  /** Error message if contract call failed (hold still works in simulated mode) */
  contractError?: string;
};

function payingFetch(): typeof fetch {
  try {
    return getX402Fetch();
  } catch {
    return fetch; // no wallet configured — will get 402 but demo can still show UI
  }
}

export async function requestHoldOnChain(req: HoldRequest): Promise<HoldResponse | null> {
  try {
    const res = await payingFetch()(`${API_URL}/holds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      // 402 means payment required but wasn't provided (no wallet)
      if (res.status === 402) {
        console.warn("[hold] 402 Payment Required — wallet not configured");
      }
      return null;
    }
    return (await res.json()) as HoldResponse;
  } catch (e) {
    // no wallet configured, or the seller has no /holds endpoint yet
    console.error("[hold] Failed to request hold:", e);
    return null;
  }
}

export type HoldStatusResponse = {
  id: string;
  status: "held" | "released" | "expired" | "settled";
  depositTx: string;
  refundTx?: string;
  settleTx?: string;
  chain: string;
};

/**
 * Poll the hold status from the backend.
 * Returns null if the hold doesn't exist or an error occurs.
 */
export async function getHoldStatus(holdId: string): Promise<HoldStatusResponse | null> {
  try {
    const res = await fetch(`${API_URL}/holds/${holdId}`);
    if (!res.ok) return null;
    return (await res.json()) as HoldStatusResponse;
  } catch {
    return null;
  }
}

export async function releaseHoldOnChain(holdId: string): Promise<{ refundTx: string } | null> {
  try {
    const res = await fetch(`${API_URL}/holds/${holdId}/release`, { method: "POST" });
    if (!res.ok) return null;
    return (await res.json()) as { refundTx: string };
  } catch {
    return null;
  }
}

export async function settleHoldOnChain(holdId: string): Promise<{ settleTx: string } | null> {
  try {
    const res = await fetch(`${API_URL}/holds/${holdId}/settle`, { method: "POST" });
    if (!res.ok) return null;
    return (await res.json()) as { settleTx: string };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------- escrow vault */

export type EscrowEntry = {
  id: string;
  flightNo: string;
  airline: string;
  route: string;
  passengers: number;
  priceLocked: number;
  fee: number;
  deposit: number;
  status: "held" | "released" | "expired" | "settled";
  createdAt: number;
  expiresAt: number;
  closedAt?: number;
  depositTx: string;
  refundTx?: string;
  settleTx?: string;
  chain: string;
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
  contract: { address: string | null; network: string; explorer: string | null; deployed: boolean };
  entries: EscrowEntry[];
};

export async function fetchEscrow(): Promise<EscrowSnapshot> {
  const res = await fetch(`${API_URL}/escrow`);
  if (!res.ok) throw new Error(`Failed to load escrow: ${res.statusText}`);
  return (await res.json()) as EscrowSnapshot;
}

/* ---------------------------------------------------------------------------
 * Flight catalog — live Google Flights rows (SerpApi, server-side) merged with
 * the demo inventory by the seller.
 * ------------------------------------------------------------------------- */

export type CatalogResponse = {
  flights: Flight[];
  returnLegs: Record<string, ReturnLeg>;
  live: number;
  source: "serpapi" | "serpapi-cache" | "none";
  fetchedAt: string | null;
  insights?: { lowest?: number; level?: string; typicalRange?: [number, number] };
  liveError?: string;
};

export type CatalogQuery = {
  from: string;
  to: string;
  depart: string;
  ret: string;
  adults: number;
  directOnly: boolean;
};

export async function fetchCatalog(q: CatalogQuery): Promise<CatalogResponse> {
  const params = new URLSearchParams({
    from: q.from,
    to: q.to,
    depart: q.depart,
    return: q.ret,
    adults: String(q.adults),
    direct: String(q.directOnly),
  });
  const res = await fetch(`${API_URL}/flights/catalog?${params}`);
  if (!res.ok) throw new Error(`Failed to load flights: ${res.statusText}`);
  return (await res.json()) as CatalogResponse;
}
