console.log("[x402-client] Module loading...");

// must come first: installs globalThis.Buffer for @x402/hedera
import "./node-globals";
import { x402Client } from "@x402/core/client";
import { createClientHederaSigner, PrivateKey } from "@x402/hedera";
import { ExactHederaScheme } from "@x402/hedera/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";

console.log("[x402-client] Imports loaded successfully");

const HEDERA_ACCOUNT_ID = import.meta.env["VITE_HEDERA_ACCOUNT_ID"] as string;
const HEDERA_PRIVATE_KEY = import.meta.env["VITE_HEDERA_PRIVATE_KEY"] as string;

console.log("[x402-client] Env vars:", {
  hasAccountId: Boolean(HEDERA_ACCOUNT_ID),
  hasPrivateKey: Boolean(HEDERA_PRIVATE_KEY),
  accountId: HEDERA_ACCOUNT_ID || "(not set)",
});

let cachedFetch: typeof fetch | null = null;
let initError: Error | null = null;

export function isWalletConfigured(): boolean {
  return Boolean(HEDERA_ACCOUNT_ID && HEDERA_PRIVATE_KEY);
}

export function getX402Fetch(): typeof fetch {
  if (cachedFetch) return cachedFetch;
  if (initError) throw initError;

  if (!HEDERA_ACCOUNT_ID || !HEDERA_PRIVATE_KEY) {
    const err = new Error(
      "x402 wallet not configured: VITE_HEDERA_ACCOUNT_ID and VITE_HEDERA_PRIVATE_KEY are required",
    );
    initError = err;
    console.error("[x402-client]", err.message);
    console.error("[x402-client] Check your frontend/.env file");
    throw err;
  }

  console.log("[x402-client] Initializing x402 client...");
  console.log("[x402-client] Account ID:", HEDERA_ACCOUNT_ID);
  console.log("[x402-client] Private key prefix:", HEDERA_PRIVATE_KEY.substring(0, 10) + "...");
  console.log("[x402-client] Network: hedera:testnet");

  try {
    // Strip 0x prefix if present (Hedera SDK expects raw hex for ECDSA keys)
    const keyStr = HEDERA_PRIVATE_KEY.startsWith("0x")
      ? HEDERA_PRIVATE_KEY.slice(2)
      : HEDERA_PRIVATE_KEY;
    console.log("[x402-client] Key length:", keyStr.length, "(expected 64 for ECDSA)");

    // Parse the private key as ECDSA
    const privateKey = PrivateKey.fromStringECDSA(keyStr);
    console.log("[x402-client] Parsed private key with fromStringECDSA");
    console.log(
      "[x402-client] Public key:",
      privateKey.publicKey.toString().substring(0, 30) + "...",
    );

    const signer = createClientHederaSigner(HEDERA_ACCOUNT_ID, privateKey, {
      network: "hedera:testnet",
    });
    console.log("[x402-client] Created Hedera signer for account", HEDERA_ACCOUNT_ID);

    // Use fromConfig with spendControls: false to allow HBAR payments
    const client = x402Client.fromConfig({
      schemes: [{ network: "hedera:*", client: new ExactHederaScheme(signer) }],
      spendControls: false, // Disable all controls - any asset, no caps
    });
    console.log("[x402-client] Created x402Client with spendControls: false");

    // Add lifecycle hooks for debugging
    client.onBeforePaymentCreation(async (context) => {
      console.log("[x402-client] onBeforePaymentCreation called");
      console.log(
        "[x402-client] Payment requirements:",
        JSON.stringify(context.paymentRequired, null, 2),
      );
      console.log(
        "[x402-client] Selected requirements:",
        JSON.stringify(context.selectedRequirements, null, 2),
      );
    });

    client.onAfterPaymentCreation(async (context) => {
      console.log("[x402-client] onAfterPaymentCreation called");
      console.log("[x402-client] Payload created successfully");
    });

    client.onPaymentCreationFailure(async (context) => {
      console.error("[x402-client] onPaymentCreationFailure called");
      console.error("[x402-client] Error:", context.error);
      console.error(
        "[x402-client] Requirements:",
        JSON.stringify(context.paymentRequired, null, 2),
      );
    });

    // Just use the wrapped fetch directly without extra wrapper
    cachedFetch = wrapFetchWithPayment(fetch, client);
    console.log("[x402-client] Created wrapped fetch function");

    console.log("[x402-client] x402 client initialized successfully");
    return cachedFetch;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    initError = err;
    console.error("[x402-client] Failed to initialize:", err.message);
    if (e instanceof Error && e.stack) {
      console.error("[x402-client] Stack:", e.stack);
    }
    throw err;
  }
}

export function getWalletAddress(): string {
  if (!HEDERA_ACCOUNT_ID) {
    return "Not configured";
  }
  return HEDERA_ACCOUNT_ID;
}
