import { useCallback, useEffect, useState } from "react";
import { fetchAccount, type AccountInfo } from "@/lib/hedera-account";
import { getWalletAddress, isWalletConfigured } from "@/lib/x402-client";

export type WalletState = {
  /** False when VITE_HEDERA_ACCOUNT_ID / _PRIVATE_KEY are missing. */
  configured: boolean;
  accountId: string | null;
  evmAddress: string | null;
  /** null until the first mirror-node read lands, or if it failed. */
  hbar: number | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

/** How often the header re-reads the balance, so a payment visibly lands. */
const POLL_MS = 8_000;

export function useWallet(): WalletState {
  const configured = isWalletConfigured();
  const accountId = configured ? getWalletAddress() : null;

  const [info, setInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!accountId) return;
    let alive = true;

    const read = () =>
      fetchAccount(accountId)
        .then((next) => {
          if (!alive) return;
          setInfo(next);
          setError(null);
        })
        .catch((e: unknown) => {
          if (!alive) return;
          setError(e instanceof Error ? e.message : "lookup failed");
        })
        .finally(() => alive && setLoading(false));

    read();
    const id = window.setInterval(read, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [accountId, tick]);

  return {
    configured,
    accountId,
    evmAddress: info?.evmAddress ?? null,
    hbar: info?.hbar ?? null,
    loading,
    error,
    refresh,
  };
}
