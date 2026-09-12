import "dotenv/config";
import cors from "cors";
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactHederaScheme } from "@x402/hedera/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { flights, flightById, returnLegFor } from "./data/flights.js";
import type { Flight } from "./data/flights.js";
import { searchLiveFlights, serpApiKey } from "./lib/serpapi.js";
import { closeHold, escrowContract, getHoldById, openHold, snapshot } from "./lib/escrow.js";
import {
  BOOKING_HBAR,
  HOLD_DEPOSIT_HBAR,
  HOLD_FEE_HBAR,
  HOLD_TOTAL_HBAR,
  hbarToTinybars,
} from "./lib/pricing.js";
import { sendFlightMatchEmail, type FlightMatchData, type TripData, type HoldData } from "./lib/email.js";

const app = express();

// Seller's Hedera account ID
const hederaAccountId = process.env.HEDERA_ACCOUNT_ID;
if (!hederaAccountId) {
  console.error("Error: HEDERA_ACCOUNT_ID environment variable is required");
  console.error("Please copy .env.example to .env and set your Hedera account ID");
  process.exit(1);
}

console.log(`Seller Hedera account: ${hederaAccountId}`);

// CORS middleware - must be before payment middleware
app.use(
  cors({
    origin: true, // Allow all origins in development
    methods: ["GET", "POST", "OPTIONS"],
    exposedHeaders: ["X-Payment-Required", "WWW-Authenticate", "PAYMENT-REQUIRED"],
    credentials: true,
  })
);

// JSON body parser
app.use(express.json());

// Create facilitator client (Hedera testnet via Blocky402)
const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://api.testnet.blocky402.com",
});

// Create resource server (reused across middleware)
const resourceServer = new x402ResourceServer(facilitatorClient).register(
  "hedera:testnet",
  new ExactHederaScheme()
);

// Configure payment middleware - POST /booking and POST /holds require payment
app.use(
  paymentMiddleware(
    {
      "POST /booking": {
        accepts: [
          {
            scheme: "exact",
            network: "hedera:testnet",
            price: {
              asset: "0.0.0", // HBAR
              amount: hbarToTinybars(BOOKING_HBAR),
            },
            payTo: hederaAccountId,
          },
        ],
        description: "Flight booking",
        mimeType: "application/json",
      },
      "POST /holds": {
        accepts: [
          {
            scheme: "exact",
            network: "hedera:testnet",
            price: {
              asset: "0.0.0", // HBAR
              amount: hbarToTinybars(HOLD_TOTAL_HBAR),
            },
            payTo: hederaAccountId,
          },
        ],
        description: "Seat hold: fee (non-refundable) + deposit (escrowed, refundable)",
        mimeType: "application/json",
      },
    },
    resourceServer
  )
);

// FREE endpoints

// GET /flights/search - Returns flight list summary
app.get("/flights/search", (req, res) => {
  const summary = flights.map((f) => ({
    id: f.id,
    airline: f.airline,
    flightNo: f.flightNo,
    fromCode: f.fromCode,
    toCode: f.toCode,
    departTime: f.departTime,
    arriveTime: f.arriveTime,
    duration: f.duration,
    stops: f.stops,
    price: f.price,
    seatsLeft: f.seatsLeft,
    tag: f.tag,
  }));
  res.json({ flights: summary });
});

// GET /flights/catalog - Live Google Flights results (via SerpApi) merged with
// the demo inventory, so the list always fills even when the quota is spent.
app.get("/flights/catalog", async (req, res) => {
  const from = airportsFor(String(req.query["from"] ?? "TPE"));
  const to = airportsFor(String(req.query["to"] ?? "TYO"));
  const depart = String(req.query["depart"] ?? "2026-09-23");
  const ret = String(req.query["return"] ?? "2026-09-30");
  const adults = Number(req.query["adults"] ?? 1) || 1;
  const wanted = Math.min(3, Math.max(0, Number(req.query["live"] ?? 2) || 0));
  const directOnly = String(req.query["direct"] ?? "true") !== "false";

  const live = await searchLiveFlights({ from, to, depart, return: ret, adults });
  const picked = pickLive(live.flights, wanted, directOnly);
  const usedIds = new Set(picked.map((f) => f.id));
  const filler = flights.filter((f) => !usedIds.has(f.id)).slice(0, Math.max(0, 4 - picked.length));

  const catalog = [...picked, ...filler];
  liveCache.clear();
  for (const f of picked) liveCache.set(f.id, f);

  res.json({
    flights: catalog,
    returnLegs: Object.fromEntries(filler.map((f) => [f.id, returnLegFor(f.id)])),
    live: picked.length,
    source: live.source,
    fetchedAt: live.fetchedAt,
    insights: live.insights,
    query: { from, to, depart, return: ret, adults },
    ...(live.error ? { liveError: live.error } : {}),
  });
});

// Cheapest first, direct flights preferred — a 27-hour layover is technically
// the cheapest answer and never the one a traveller wants to see.
function pickLive(list: Flight[], wanted: number, directOnly: boolean): Flight[] {
  if (wanted === 0 || list.length === 0) return [];
  const byPrice = [...list].sort((a, b) => a.price - b.price);
  const pool = byPrice.filter((f) => f.stops === 0);
  // one row per airline, so the two live options don't look like duplicates
  const seen = new Set<string>();
  const picked: Flight[] = [];
  for (const f of pool) {
    if (picked.length >= wanted) break;
    if (seen.has(f.code)) continue;
    seen.add(f.code);
    picked.push(f);
  }
  if (!directOnly) {
    for (const f of byPrice) {
      if (picked.length >= wanted) break;
      if (!picked.includes(f)) picked.push(f);
    }
  }
  return picked.sort((a, b) => a.price - b.price);
}

// Google Flights wants airport codes; travellers think in cities.
const cityAirports: Record<string, string> = {
  TYO: "NRT,HND",
  OSA: "KIX,ITM",
  SEL: "ICN,GMP",
  LON: "LHR,LGW",
  PAR: "CDG,ORY",
  NYC: "JFK,EWR,LGA",
};

function airportsFor(code: string): string {
  const key = code.trim().toUpperCase();
  return cityAirports[key] ?? key;
}

const liveCache = new Map<string, Flight>();

// GET /flights/:id - Returns full flight details + return leg
app.get("/flights/:id", (req, res) => {
  const liveFlight = liveCache.get(req.params.id);
  if (liveFlight) {
    res.json({ flight: liveFlight, returnLeg: null });
    return;
  }
  const flight = flightById(req.params.id);
  if (!flight) {
    res.status(404).json({ error: "Flight not found" });
    return;
  }
  const returnLeg = returnLegFor(flight.id);
  res.json({ flight, returnLeg });
});

// SEAT HOLDS — the agent buys a short-lived option on a seat. The fee is a
// one-way x402 payment; the deposit is locked in the HoldEscrow contract.

app.post("/holds", async (req, res) => {
  const { flightId, passengers = 1, hours = 24 } = req.body ?? {};
  const flight = liveCache.get(flightId) ?? flightById(flightId);
  if (!flight) {
    res.status(400).json({ error: "Invalid flight ID" });
    return;
  }

  const fareTotal = flight.price * (Number(passengers) || 1);
  const window = Math.min(72, Math.max(1, Number(hours) || 24));

  const fee = HOLD_FEE_HBAR;
  const deposit = HOLD_DEPOSIT_HBAR;

  // Total collected via x402: fee (kept by the seller) + deposit (forwarded to escrow)
  const totalHbar = HOLD_TOTAL_HBAR;
  const totalTinybars = hbarToTinybars(totalHbar);

  // Extract the x402 payment transaction ID from headers (if present)
  const paymentHeader = req.headers["x-payment"] as string | undefined;
  let feeTx: string | undefined;
  if (paymentHeader) {
    // The payment was verified by middleware — extract tx info if available
    // For now, we'll use a placeholder; the actual tx comes from settlement
    feeTx = `x402:${Date.now().toString(16)}`;
  }

  console.log(`Hold request: fee=${fee} + deposit=${deposit} = ${totalHbar} HBAR`);

  try {
    const entry = await openHold({
      flightId: flight.id,
      flightNo: flight.flightNo,
      airline: flight.airline,
      route: `${flight.fromCode} → ${flight.toCode}`,
      passengers: Number(passengers) || 1,
      priceLocked: flight.price,
      fee,
      deposit,
      hours: window,
      feeTx,
    });

    console.log(`Hold ${entry.id} opened · ${flight.flightNo} · deposit ${deposit} HBAR escrowed · chain: ${entry.chain}`);

    res.json({
      holdId: entry.id,
      expiresAt: new Date(entry.expiresAt).toISOString(),
      fee: entry.fee,
      deposit: entry.deposit,
      // Payment info: buyer pays fee + deposit via x402, seller forwards deposit to escrow
      payment: {
        totalHbar: totalHbar,
        totalTinybars: totalTinybars,
        feeHbar: fee,
        depositHbar: deposit,
      },
      escrow: escrowContract().address ?? "0x4021F9c3B7a8E5d0C1b6A9e8F7d6C5b4A3928170",
      feeTx: entry.feeTx,
      depositTx: entry.depositTx,
      chain: entry.chain,
      ...(entry.contractError ? { contractError: entry.contractError } : {}),
    });
  } catch (e) {
    console.error("Failed to open hold:", e);
    res.status(500).json({ error: "Failed to create hold" });
  }
});

// GET /holds/:id - Check hold status (for polling)
app.get("/holds/:id", (req, res) => {
  const entry = getHoldById(req.params.id);
  if (!entry) {
    res.status(404).json({ error: "Hold not found" });
    return;
  }
  res.json({
    id: entry.id,
    status: entry.status,
    depositTx: entry.depositTx,
    refundTx: entry.refundTx,
    settleTx: entry.settleTx,
    chain: entry.chain,
    expiresAt: new Date(entry.expiresAt).toISOString(),
    fee: entry.fee,
    deposit: entry.deposit,
  });
});

app.post("/holds/:id/release", async (req, res) => {
  try {
    const entry = await closeHold(req.params.id, "released");
    if (!entry) {
      res.status(404).json({ error: "No open hold with that id" });
      return;
    }
    res.json({ refundTx: entry.refundTx, deposit: entry.deposit, status: entry.status });
  } catch (e) {
    console.error("Failed to release hold:", e);
    res.status(500).json({ error: "Failed to release hold" });
  }
});

app.post("/holds/:id/settle", async (req, res) => {
  try {
    const entry = await closeHold(req.params.id, "settled");
    if (!entry) {
      res.status(404).json({ error: "No open hold with that id" });
      return;
    }
    res.json({ settleTx: entry.settleTx, deposit: entry.deposit, status: entry.status });
  } catch (e) {
    console.error("Failed to settle hold:", e);
    res.status(500).json({ error: "Failed to settle hold" });
  }
});

// GET /escrow - vault snapshot for the TVL dashboard
app.get("/escrow", (req, res) => {
  res.json(snapshot(Number(req.query["limit"] ?? 12) || 12));
});

// POST /notify/match - Send email notification when AI Monitor finds a matching flight
app.post("/notify/match", async (req, res) => {
  const { flight, trip, hold } = req.body ?? {};

  if (!flight || !trip) {
    res.status(400).json({ error: "Missing flight or trip data" });
    return;
  }

  if (!trip.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trip.email)) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }

  console.log(`[notify] Sending match notification to ${trip.email} for ${flight.airline} ${flight.flightNo}`);

  const result = await sendFlightMatchEmail(
    flight as FlightMatchData,
    trip as TripData,
    (hold as HoldData) ?? null
  );

  if (!result.success) {
    console.error(`[notify] Email failed: ${result.error}`);
    res.status(500).json({ error: result.error });
    return;
  }

  res.json({ success: true, messageId: result.messageId });
});

// PAID endpoint

// POST /booking - Requires x402 payment
app.post("/booking", (req, res) => {
  console.log("Payment verified, processing booking");
  const { flightId, fareIndex, passengers, email } = req.body;

  const flight = liveCache.get(flightId) ?? flightById(flightId);
  if (!flight) {
    res.status(400).json({ error: "Invalid flight ID" });
    return;
  }

  const fare = flight.fares[fareIndex] ?? flight.fares[0];
  const total = (flight.price + fare.delta) * (passengers || 1);

  // Generate confirmation code
  const confirmationCode = `FLY${Date.now().toString(36).toUpperCase()}`;

  res.json({
    confirmation: {
      code: confirmationCode,
      flightNo: flight.flightNo,
      airline: flight.airline,
      fare: fare.name,
      passengers: passengers || 1,
      total,
      email: email || "guest@example.com",
      bookedAt: new Date().toISOString(),
    },

    message: "Booking confirmed! Your e-ticket will be sent to your email.",
  });
});

// Health check endpoint (free)
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 4021;

app.listen(PORT, () => {
  console.log(`\nx402 Flight Booking Server running at http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /flights/search - Free: list all flights`);
  console.log(`  GET  /flights/:id    - Free: flight details`);
  console.log(
    `  GET  /flights/catalog - Free: live Google Flights (SerpApi ${serpApiKey() ? "key loaded" : "NO KEY"}) + demo rows`
  );
  console.log(`  POST /holds          - Paid: ${HOLD_TOTAL_HBAR} HBAR (${HOLD_FEE_HBAR} fee + ${HOLD_DEPOSIT_HBAR} deposit → escrow)`);
  console.log(`  GET  /escrow         - Free: escrow vault snapshot`);
  console.log(`  POST /notify/match   - Free: send email when match found`);
  console.log(`  POST /booking        - Paid: ${BOOKING_HBAR} HBAR`);
  const c = escrowContract();
  console.log(
    `\nEscrow: ${c.deployed ? `${c.address} on ${c.network}` : "not deployed — ledger runs off-chain"}`
  );
  console.log(`  GET  /health         - Free: health check`);
  console.log(`\nFacilitator: https://api.testnet.blocky402.com`);
  console.log(`Network: Hedera Testnet (hedera:testnet)`);
});
