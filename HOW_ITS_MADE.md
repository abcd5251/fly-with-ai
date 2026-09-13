# Fly402 — submission copy

## Description

Fly402 is a flight booking app built for an AI travel agent that pays for things by itself. A
traveller fills in one request — route, dates, passengers, a budget and a spending policy — and the
agent watches live fares, takes a seat off the market when something lands under budget, and emails
a link straight into the booking page. Every payment it makes is an HTTP request, not a checkout
flow.

Payments run on the **x402 protocol over Hedera testnet**, settled through the **Blocky402
facilitator**. Two seller endpoints are gated: `POST /holds` at 0.5 HBAR and `POST /booking` at
0.1 HBAR, quoted in tinybars under the `exact` scheme on `hedera:testnet` with HBAR (asset
`0.0.0`). An unpaid call returns a real `402 Payment Required`; the agent signs a Hedera transfer
with an ECDSA key and retries, and `wrapFetchWithPayment` collapses that handshake into an ordinary
`fetch` — so booking is one function call and the payment is the transport.

The product is built around the **seat hold**: an option on real inventory, which a normal checkout
cannot express. One payment carries two kinds of money — a small non-refundable fee, and a larger
refundable deposit the seller forwards into `HoldEscrow.sol`, called through the Hiero SDK and
keyed by a SHA-256 of the internal hold id. The contract has no owner, no pause, no upgrade. The
deposit leaves by one door: `settle()` to the seller before expiry, or `refund()` back to the payer
— and after expiry that refund is callable by **anyone**, so an offline seller can never strand a
traveller's money.

The agent is bounded before it spends: max fee and max deposit are checked locally before any 402
is answered. Everything is checkable — every settlement and escrow call resolves to a HashScan
transaction, and the escrow dashboard's TVL is read live from the contract's `stats()`. Fares are
live Google Flights data via SerpApi, cached 12h and served stale on failure; match emails go out
through Resend with deep links carrying trip context.

**Stack:** React 19, TanStack Start, Vite, Tailwind v4; Express 5 + TypeScript; `@x402/core`,
`@x402/express`, `@x402/hedera`, `@x402/fetch`; `@hiero-ledger/sdk`; Solidity 0.8.24 via Hardhat on
the Hedera JSON-RPC relay.

## How it's Made


Fly402 is a React 19 / TanStack Start frontend and an Express 5 TypeScript seller backed by a
Solidity escrow on Hedera testnet. Two endpoints are x402-gated — `POST /holds` at 0.5 HBAR and
`POST /booking` at 0.1 HBAR — quoted in tinybars through the `exact` scheme on `hedera:testnet`,
with `ExactHederaScheme` registered on an `x402ResourceServer` whose facilitator is Blocky402. The
consuming agent lives in the browser: an ECDSA Hedera signer plus `wrapFetchWithPayment` collapses
the whole 402 → sign → retry handshake into an ordinary `fetch`, so the payment is the transport.
The hacky part is that one atomic x402 payment has to become two different kinds of money — a
non-refundable fee the seller keeps, and a refundable deposit it is only holding — so the seller
forwards the deposit into `HoldEscrow.sol` through a `ContractExecuteTransaction` keyed by a
SHA-256 of the internal hold id, keeping off-chain ids opaque on-chain.

- **Ownerless escrow**, no pause, no upgrade path. `settle()` is callable only by the payer and
  only before expiry; after expiry `refund()` is callable by anyone, so a seller that goes offline
  cannot strand a traveller's deposit.
- **TVL is a chain read** from the contract's `stats()`, not a local tally, and every settlement
  and escrow call resolves to a real HashScan transaction link.
- **A spending policy is a hard gate.** Auto-hold, max fee and max deposit are checked locally
  before any 402 is answered, so the agent can run unattended without overspending.
- **Live Google Flights inventory** via server-side SerpApi, cached 12h and served stale on
  failure; a Resend email deep-links back into the booking page with full trip context.
