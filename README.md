# Fly402 - Flight Booking with x402 Payments on Hedera

A demo flight booking application showcasing the [x402 payment protocol](https://x402.org) on [Hedera](https://hedera.com) testnet. Users can browse flights and pay for bookings using HBAR through seamless HTTP 402 payments.

## Overview

Fly402 demonstrates how to integrate x402 payments into a real-world application:

- **Frontend**: React app built with TanStack Router and Vite
- **Backend**: Express.js server with x402 payment middleware
- **Payment**: 
per booking via Hedera testnet

The x402 protocol enables native HTTP payments where protected resources return `402 Payment Required` responses, and clients automatically handle payment authorization.

## Features

- Browse available flights with pricing and details
- Select fares and view itineraries
- Pay for bookings with HBAR on Hedera testnet
- Automatic payment handling via x402 protocol
- Real-time booking confirmation
- **Seat Holds with Escrow**: Lock in prices with refundable deposits secured by on-chain escrow
- **AI Monitor with Email Notifications**: Autonomous agent monitors fares and sends email when a match is found
- **Deep Linking**: Email links open directly to the matched flight with trip context preserved

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

   # Email notifications (Resend) - optional
   RESEND_API_KEY=re_xxxxx          # Get from https://resend.com
   EMAIL_FROM=onboarding@resend.dev # Or your verified domain email
   APP_URL=http://localhost:8080    # Frontend URL for deep links
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
| `/flights/catalog` | GET | Free | Live Google Flights + demo inventory |
| `/flights/:id` | GET | Free | Flight details |
| `/holds` | POST | Paid (0.5 HBAR) | Create seat hold with escrow |
| `/holds/:id` | GET | Free | Check hold status |
| `/holds/:id/release` | POST | Free | Release hold and refund deposit |
| `/notify/match` | POST | Free | Send email notification for matched flight |
| `/escrow` | GET | Free | Escrow vault snapshot |
| `/booking` | POST | Paid (0.1 HBAR) | Create booking |
| `/health` | GET | Free | Health check |

### Start the Frontend

```bash
cd frontend
npm run dev
```

The app will be available at `http://localhost:8080`

## Testing the Payment Flow

1. **Browse Flights**: Open the frontend and browse available flights

2. **Select a Flight**: Click on a flight to view details and select a fare

3. **Proceed to Booking**: Review the booking summary showing "0.1 HBAR · Hedera Testnet"

4. **Confirm & Pay**: Click the pay button - the x402 client will:
   - Receive a 402 Payment Required response
   - Sign a Hedera transaction authorizing 0.1 HBAR
   - Submit the payment through the Blocky402 facilitator
   - Receive the booking confirmation

5. **Verify on Hedera**: Check your transaction on [HashScan](https://hashscan.io/testnet)

### Testing Seat Holds

1. **Browse Flights**: Open the frontend and set up your trip criteria
2. **Select a Flight**: Click on a flight to view details
3. **Hold the Seat**: Click "Hold this seat" - the x402 client will:
   - Pay 0.5 HBAR (0.1 HBAR fee + 0.4 HBAR deposit)
   - The deposit is locked in the escrow contract (if configured)
   - The hold expires after the selected window (6 or 24 hours)
4. **Release or Book**: Either release the hold (get deposit refunded) or proceed to booking

### Testing the 402 Response

You can test the payment-required response directly:

```bash
# Test booking endpoint
curl -i -X POST http://localhost:4021/booking

# Test holds endpoint
curl -i -X POST http://localhost:4021/holds \
  -H "Content-Type: application/json" \
  -d '{"flightId": "UA2491", "passengers": 1, "hours": 24}'
```

Both return a `402 Payment Required` with payment instructions in the `PAYMENT-REQUIRED` header.

## Project Structure

```
fly402/
├── backend/
│   └── seller/
│       ├── src/
│       │   ├── index.ts              # Express server with x402 middleware
│       │   ├── data/flights.ts       # Mock flight data
│       │   └── lib/
│       │       ├── email.ts          # Email service (Resend)
│       │       ├── escrow.ts         # Hold state management
│       │       ├── pricing.ts        # Every amount the buyer is charged
│       │       ├── hedera-client.ts  # Hedera SDK + escrow contract calls
│       │       └── serpapi.ts        # Live flight search
│       ├── package.json
│       └── .env.example
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── x402-client.ts    # x402 client configuration
│   │   │   ├── api.ts            # API client with x402 payment
│   │   │   ├── trip.ts           # Trip types and URL helpers
│   │   │   └── hold.ts           # Hold types and quote calculation
│   │   ├── routes/
│   │   │   ├── index.tsx         # Trip setup + AI Monitor
│   │   │   ├── flight.tsx        # Flight details + hold management
│   │   │   └── booking.tsx       # Booking page with payment
│   │   └── components/
│   ├── package.json
│   └── .env.example
├── contracts/
│   ├── src/HoldEscrow.sol        # Escrow contract for hold deposits
│   ├── scripts/deploy.cjs        # Hedera deployment script
│   ├── hardhat.config.cjs        # Hardhat configuration
│   └── .env.example
└── README.md
```

## Escrow Contract (Optional)

The HoldEscrow contract secures refundable seat-hold deposits on-chain. Without it, holds work in "simulated" mode with local tracking.

### Deploy the Contract

1. **Install contract dependencies**
   ```bash
   cd contracts
   npm install
   ```

2. **Configure deployment**
   ```bash
   cp .env.example .env
   # Edit .env with your Hedera operator credentials:
   # HEDERA_OPERATOR_ID=0.0.xxxxx
   # HEDERA_OPERATOR_KEY=302e...
   ```

3. **Deploy to testnet**
   ```bash
   npm run deploy:hedera
   ```

4. **Configure backend** - Add the deployed contract address to `backend/seller/.env`:
   ```env
   HEDERA_ESCROW_ADDRESS=0x...
   HEDERA_OPERATOR_ID=0.0.xxxxx
   HEDERA_OPERATOR_KEY=302e...
   ```

### Contract Functions

| Function | Description |
|----------|-------------|
| `open(holdId, seller, expiresAt)` | Lock deposit for a hold |
| `settle(holdId)` | Release deposit to seller (booking confirmed) |
| `refund(holdId)` | Return deposit to seller (hold released) |

## Email Notifications

The AI Monitor can send email notifications when it finds a flight matching your criteria.

### Setup

1. **Get a Resend API key** at [resend.com](https://resend.com)

2. **Configure environment variables** in `backend/seller/.env`:
   ```env
   RESEND_API_KEY=re_xxxxx
   EMAIL_FROM=onboarding@resend.dev
   APP_URL=http://localhost:8080
   ```

3. **For testing**: Use `onboarding@resend.dev` as the sender - emails can only be sent to your Resend signup email

4. **For production**: Verify your own domain in Resend to send to any email address

### How It Works

1. User sets trip criteria and starts monitoring
2. AI Monitor detects a matching flight
3. Backend sends email via Resend with flight details
4. Email includes a deep link to `/flight?flightId=xxx&tripData=xxx`
5. Clicking the link opens the flight page with full trip context

### Email Content

- Flight details (airline, route, times, price)
- Budget comparison
- Hold status (if seat was auto-held)
- "View Flight & Book" button with deep link
- Trip summary

## Payment Configuration

### Booking Payment

| Setting | Value |
|---------|-------|
| Network | `hedera:testnet` |
| Asset | HBAR (`0.0.0`) |
| Amount | 0.1 HBAR (10,000,000 tinybars) |
| Facilitator | `https://api.testnet.blocky402.com` |

### Seat Hold Payment

Seat holds use x402 for payment and an on-chain escrow contract for the refundable deposit.

| Setting | Value |
|---------|-------|
| Network | `hedera:testnet` |
| Asset | HBAR (`0.0.0`) |
| Fee | 0.1 HBAR (non-refundable, paid to seller) |
| Deposit | 0.4 HBAR (refundable, locked in escrow) |
| Total | 0.5 HBAR (50,000,000 tinybars) |
| Escrow Contract | HoldEscrow (Solidity) |

**Payment Flow:**
1. Buyer pays fee + deposit via x402 to seller
2. Seller forwards deposit to HoldEscrow contract
3. On release: deposit refunded to seller (who refunds buyer off-chain)
4. On settle: deposit released to seller as payment

> **Note**: Every amount is a fixed constant, denominated in HBAR. Change it in
> `backend/seller/src/lib/pricing.ts` and mirror it in `frontend/src/lib/hold.ts`.

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
