# HoldEscrow — refundable seat-hold deposits on Hedera

One contract, three doors. An agent locks a deposit against a hold id; the money
leaves by `settle` (traveller booked → seller), `refund` (traveller passed →
payer), or `refund` after expiry (**anyone** can call it → payer). No owner, no
pause, no upgrade path — a seller that disappears cannot strand a deposit.

```
open(id, seller, expiresAt) payable   agent locks the deposit
settle(id)                            payer only, before expiry → seller
refund(id)                            payer any time; anyone after expiry → payer
stats() → (locked, settled, refunded, opened)
```

`totalLocked` is the vault's live TVL and is what the app's Escrow page reads.

## Why this shape suits Hedera

- **Predictable fees.** A hold is worth a couple of dollars; a settlement layer
  with volatile gas would eat the margin. Hedera's fees are fixed in USD terms.
- **Fast finality.** The agent has a 90-second quote window to lock the deposit
  before the seat goes back on sale.
- **Timeout refunds need no keeper.** Anyone can call `refund` after expiry, and
  Hedera scheduled transactions can fire it automatically.
- **Deposits are recurring, high-velocity TVL.** Every held seat parks value for
  the length of its window and then recycles — utilisation, not idle capital.

## Deploy to Hedera testnet

```bash
cd contracts
npm install
cp .env.example .env          # add an ECDSA key funded at portal.hedera.com
npm run compile
npm run deploy:hedera         # chainId 296 via https://testnet.hashio.io/api
```

The script prints the address and a HashScan link. Then:

```bash
# backend/seller/.env
HEDERA_ESCROW_ADDRESS=0x...
HEDERA_NETWORK=testnet
```

The seller starts reporting that address (and HashScan links) on `GET /escrow`,
and the app's Escrow page flips from `ledger mirrored off-chain` to
`settling on Hedera`. Nothing else in the app changes.
