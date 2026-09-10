import "dotenv/config";
import { wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

async function main() {
  // 1. Check for required environment variables
  const privateKey = process.env.EVM_PRIVATE_KEY;
  if (!privateKey) {
    console.error("Error: EVM_PRIVATE_KEY environment variable is required");
    console.error("Please copy .env.example to .env and set your private key");
    process.exit(1);
  }

  // 2. Create EVM wallet signer from private key
  const signer = privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`Wallet address: ${signer.address}`);

  // 3. Initialize x402 client and register EVM payment scheme
  const client = new x402Client();
  client.register("eip155:*", new ExactEvmScheme(signer));

  // 4. Wrap fetch with automatic payment handling
  const fetchWithPayment = wrapFetchWithPayment(fetch, client);
  const httpClient = new x402HTTPClient(client);

  // 5. Make a request to a paid endpoint
  const endpoint = process.env.API_ENDPOINT || "http://localhost:4021/weather";
  console.log(`\nRequesting: ${endpoint}`);

  try {
    const response = await fetchWithPayment(`${endpoint}/weather`, {
      method: "GET",
    });

    // 6. Process the response
    const result = await httpClient.processResponse(response);

    console.log(`\nStatus: ${response.status}`);
    console.log("Response:", result.body);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`\nError: ${error.message}`);
    } else {
      console.error("\nAn unknown error occurred");
    }
  }
}

main();
