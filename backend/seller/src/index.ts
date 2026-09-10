import "dotenv/config";
import cors from "cors";
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { flights, flightById, returnLegFor } from "./data/flights.js";
import type { Flight } from "./data/flights.js";
import { searchLiveFlights, serpApiKey } from "./lib/serpapi.js";

const app = express();

// Seller's receiving wallet address
const evmAddress = process.env.EVM_ADDRESS;
if (!evmAddress) {
  console.error("Error: EVM_ADDRESS environment variable is required");
  console.error("Please copy .env.example to .env and set your wallet address");
  process.exit(1);
}

console.log(`Seller wallet address: ${evmAddress}`);

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

// Create facilitator client (testnet)
const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://x402.org/facilitator",
});

// Configure payment middleware - only POST /booking requires payment
app.use(
  paymentMiddleware(
    {
      "POST /booking": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.10", // 10 cents USDC
            network: "eip155:84532", // Base Sepolia
            payTo: evmAddress,
          },
        ],
        description: "Flight booking",
        mimeType: "application/json",
      },
    },
    new x402ResourceServer(facilitatorClient).register(
      "eip155:84532",
      new ExactEvmScheme()
    )
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
  console.log(`  POST /booking        - Paid: $0.10 USDC on Base Sepolia`);
  console.log(`  GET  /health         - Free: health check`);
  console.log(`\nFacilitator: https://x402.org/facilitator (testnet)`);
  console.log(`Network: Base Sepolia (eip155:84532)`);
});
