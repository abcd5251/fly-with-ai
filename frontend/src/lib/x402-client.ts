import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { privateKeyToAccount } from "viem/accounts";

const DEMO_PRIVATE_KEY = import.meta.env["VITE_DEMO_PRIVATE_KEY"] as `0x${string}`;

let cachedFetch: typeof fetch | null = null;

export function getX402Fetch(): typeof fetch {
  if (cachedFetch) return cachedFetch;

  if (!DEMO_PRIVATE_KEY) {
    throw new Error("VITE_DEMO_PRIVATE_KEY is not set in environment variables");
  }

  const signer = privateKeyToAccount(DEMO_PRIVATE_KEY);
  const client = new x402Client();
  client.register(
    "eip155:84532",
    new ExactEvmScheme(signer, {
      84532: { rpcUrl: "https://sepolia.base.org" },
    })
  );
  cachedFetch = wrapFetchWithPayment(fetch, client);
  return cachedFetch;
}

export function getWalletAddress(): string {
  if (!DEMO_PRIVATE_KEY) {
    return "Not configured";
  }
  const signer = privateKeyToAccount(DEMO_PRIVATE_KEY);
  return signer.address;
}
