# Fly402 - Flight Booking with x402 Payments on Hedera

A demo flight booking application showcasing the [x402 payment protocol](https://x402.org) on [Hedera](https://hedera.com) testnet. Users can browse flights and pay for bookings using HBAR through seamless HTTP 402 payments.

## Overview

Fly402 demonstrates how to integrate x402 payments into a real-world application:

- **Frontend**: React app built with TanStack Router and Vite
- **Backend**: Express.js server with x402 payment middleware
- **Payment**: 1 HBAR per booking via Hedera testnet

The x402 protocol enables native HTTP payments where protected resources return `402 Payment Required` responses, and clients automatically handle payment authorization.

## Features

- Browse available flights with pricing and details
- Select fares and view itineraries
- Pay for bookings with HBAR on Hedera testnet
- Automatic payment handling via x402 protocol
- Real-time booking confirmation

## Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│    Frontend     │◄───────►│    Backend      │◄───────►│   Facilitator   │
│   (React/Vite)  │  HTTP   │   (Express)     │  x402   │  (Blocky402)    │
│                 │         │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
        │                           │                           │
        │                           │                           │
        ▼                           ▼                           ▼
   x402 Client              x402 Middleware              Hedera Testnet
   (signs payments)         (verifies payments)          (settles HBAR)
```

## Prerequisites

- **Node.js** v20 or higher
- **Hedera Testnet Account** - Create at [portal.hedera.com](https://portal.hedera.com)
- **Testnet HBAR** - Get from the Hedera faucet in the portal

> **Important**: Your Hedera account must use an **ECDSA key** (not ED25519) for x402 compatibility.

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/pureflowai/fly402.git
   cd fly402
   ```

2. **Install backend dependencies**
   ```bash
   cd backend/seller
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../../frontend
   npm install
   ```

## Configuration

### Backend Configuration

1. Copy the example environment file:
   ```bash
   cd backend/seller
   cp .env.example .env
   ```

2. Edit `.env` with your Hedera account ID (seller/receiver):
   ```env
   # Seller's Hedera account ID (receives payments)
   HEDERA_ACCOUNT_ID=0.0.xxxxx

   # Server port
   PORT=4021
   ```

### Frontend Configuration

1. Copy the example environment file:
   ```bash
   cd frontend
   cp .env.example .env
   ```

2. Edit `.env` with your Hedera credentials (buyer/payer):
   ```env
   # API URL for the backend server
   VITE_API_URL=http://localhost:4021

   # Hedera Testnet account credentials (payer)
   VITE_HEDERA_ACCOUNT_ID=0.0.xxxxx
   VITE_HEDERA_PRIVATE_KEY=302e...
   ```

> **Note**: Use different Hedera accounts for seller (backend) and buyer (frontend) to simulate real payments.

## Running the Application

### Start the Backend

```bash
cd backend/seller
npm run dev
```

The server will start at `http://localhost:4021` with the following endpoints:

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/flights/search` | GET | Free | List all flights |
| `/flights/:id` | GET | Free | Flight details |
| `/booking` | POST | Paid (1 HBAR) | Create booking |
| `/health` | GET | Free | Health check |

### Start the Frontend

```bash
cd frontend
npm run dev
```

The app will be available at `http://localhost:5173`

## Testing the Payment Flow

1. **Browse Flights**: Open the frontend and browse available flights

2. **Select a Flight**: Click on a flight to view details and select a fare

3. **Proceed to Booking**: Review the booking summary showing "1 HBAR · Hedera Testnet"

4. **Confirm & Pay**: Click the pay button - the x402 client will:
   - Receive a 402 Payment Required response
   - Sign a Hedera transaction authorizing 1 HBAR
   - Submit the payment through the Blocky402 facilitator
   - Receive the booking confirmation

5. **Verify on Hedera**: Check your transaction on [HashScan](https://hashscan.io/testnet)

### Testing the 402 Response

You can test the payment-required response directly:

```bash
curl -i -X POST http://localhost:4021/booking
```

This returns a `402 Payment Required` with payment instructions in the `PAYMENT-REQUIRED` header.

## Project Structure

```
fly402/
├── backend/
│   └── seller/
│       ├── src/
│       │   ├── index.ts          # Express server with x402 middleware
│       │   └── data/flights.ts   # Mock flight data
│       ├── package.json
│       └── .env.example
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── x402-client.ts    # x402 client configuration
│   │   │   └── api.ts            # API client
│   │   ├── routes/
│   │   │   └── booking.tsx       # Booking page with payment
│   │   └── components/
│   ├── package.json
│   └── .env.example
└── README.md
```

## Payment Configuration

| Setting | Value |
|---------|-------|
| Network | `hedera:testnet` |
| Asset | HBAR (`0.0.0`) |
| Amount | 1 HBAR (100,000,000 tinybars) |
| Facilitator | `https://api.testnet.blocky402.com` |

## Technologies

- **Frontend**: React 19, TanStack Router, Vite, Tailwind CSS
- **Backend**: Express.js, TypeScript
- **Payments**: x402 Protocol, Hedera Hashgraph
- **x402 Packages**: `@x402/core`, `@x402/hedera`, `@x402/express`, `@x402/fetch`

## Resources

- [x402 Documentation](https://docs.x402.org)
- [Hedera Documentation](https://docs.hedera.com)
- [Hedera Portal](https://portal.hedera.com) - Create testnet accounts
- [HashScan](https://hashscan.io/testnet) - Hedera block explorer

## License

MIT
