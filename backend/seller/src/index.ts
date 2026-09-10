import "dotenv/config";
import cors from "cors";
import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactHederaScheme } from "@x402/hedera/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { flights, flightById, returnLegFor } from "./data/flights.js";

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

// Configure payment middleware - only POST /booking requires payment
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
              amount: "100000000", // 1 HBAR in tinybars
            },
            payTo: hederaAccountId,
          },
        ],
        description: "Flight booking",
        mimeType: "application/json",
      },
    },
    new x402ResourceServer(facilitatorClient).register(
      "hedera:testnet",
      new ExactHederaScheme()
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

// GET /flights/:id - Returns full flight details + return leg
app.get("/flights/:id", (req, res) => {
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

  const flight = flightById(flightId);
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
  console.log(`  POST /booking        - Paid: 1 HBAR on Hedera Testnet`);
  console.log(`  GET  /health         - Free: health check`);
  console.log(`\nFacilitator: https://api.testnet.blocky402.com`);
  console.log(`Network: Hedera Testnet (hedera:testnet)`);
});
