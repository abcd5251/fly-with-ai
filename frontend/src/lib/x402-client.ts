import { x402Client } from "@x402/core/client";
import { createClientHederaSigner, PrivateKey } from "@x402/hedera";
import { ExactHederaScheme } from "@x402/hedera/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";

const HEDERA_ACCOUNT_ID = import.meta.env["VITE_HEDERA_ACCOUNT_ID"] as string;
const HEDERA_PRIVATE_KEY = import.meta.env["VITE_HEDERA_PRIVATE_KEY"] as string;

let cachedFetch: typeof fetch | null = null;

export function getX402Fetch(): typeof fetch {
  if (cachedFetch) return cachedFetch;

  if (!HEDERA_ACCOUNT_ID || !HEDERA_PRIVATE_KEY) {
    throw new Error("VITE_HEDERA_ACCOUNT_ID and VITE_HEDERA_PRIVATE_KEY are required in environment variables");
  }

  const signer = createClientHederaSigner(
    HEDERA_ACCOUNT_ID,
    PrivateKey.fromStringECDSA(HEDERA_PRIVATE_KEY),
    { network: "hedera:testnet" }
  );

  // Configure client with HBAR allowed in spend controls
  const client = x402Client.fromConfig({
    schemes: [
      { network: "hedera:testnet", client: new ExactHederaScheme(signer) },
    ],
    spendControls: {
      // Allow HBAR (asset 0.0.0) on Hedera testnet
      allowedAssets: [
        { network: "hedera:testnet", asset: "0.0.0" },
      ],
    },
  });

  cachedFetch = wrapFetchWithPayment(fetch, client);
  return cachedFetch;
}

export function getWalletAddress(): string {
  if (!HEDERA_ACCOUNT_ID) {
    return "Not configured";
  }
  return HEDERA_ACCOUNT_ID;
}
