/**
 * Read-only account lookups against the public Hedera mirror node.
 *
 * The buyer's wallet lives entirely in the browser (VITE_HEDERA_ACCOUNT_ID), so
 * its balance is read straight from the mirror node rather than through the
 * seller — every visitor sees their own account, not the seller's.
 */

const MIRROR: Record<string, string> = {
  testnet: "https://testnet.mirrornode.hedera.com",
  mainnet: "https://mainnet-public.mirrornode.hedera.com",
  previewnet: "https://previewnet.mirrornode.hedera.com",
};

/** The network the x402 client is pinned to. */
export const NETWORK = "testnet";

export type AccountInfo = {
  accountId: string;
  evmAddress: string | null;
  /** Balance in HBAR (mirror node reports tinybars). */
  hbar: number;
};

export async function fetchAccount(accountId: string): Promise<AccountInfo> {
  const base = MIRROR[NETWORK] ?? MIRROR["testnet"];
  const res = await fetch(`${base}/api/v1/accounts/${accountId}?limit=1`);
  if (!res.ok) throw new Error(`mirror node ${res.status}`);
  const data = (await res.json()) as {
    balance?: { balance?: number };
    evm_address?: string | null;
  };
  return {
    accountId,
    evmAddress: data.evm_address ?? null,
    hbar: (data.balance?.balance ?? 0) / 1e8,
  };
}

export function hashscanAccount(accountId: string) {
  return `https://hashscan.io/${NETWORK}/account/${accountId}`;
}

/** 110.5 → "110.50" */
export function fmtHbar(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Hedera transaction ids come in two spellings: the SDK prints
 * `0.0.123@1700000000.000000001`, the mirror node and HashScan use
 * `0.0.123-1700000000-000000001`. Explorer links need the second.
 */
const TX_ID = /^(\d+\.\d+\.\d+)[@-](\d+)[.-](\d+)$/;

/** True for a real on-chain transaction id — not a locally generated stand-in. */
export function isTxId(raw: string | null | undefined): boolean {
  return typeof raw === "string" && TX_ID.test(raw.trim());
}

/** Explorer URL for a transaction, or null when the id is not a real one. */
export function hashscanTx(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const m = TX_ID.exec(raw.trim());
  if (!m) return null;
  return `https://hashscan.io/${NETWORK}/transaction/${m[1]}-${m[2]}-${m[3]}`;
}

export function hashscanContract(address: string) {
  return `https://hashscan.io/${NETWORK}/contract/${address}`;
}

/** `0.0.123-1700000000-000000001` → `0.0.123@…0001`; hex → `0x1234…abcd`. */
export function shortId(raw: string) {
  const m = TX_ID.exec(raw.trim());
  if (m?.[1] && m[3]) return `${m[1]}@…${m[3].slice(-6)}`;
  return raw.length > 18 ? `${raw.slice(0, 8)}…${raw.slice(-6)}` : raw;
}
