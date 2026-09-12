import { ExternalLink } from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";
import { fmtHbar, hashscanAccount, NETWORK } from "@/lib/hedera-account";

/**
 * The header wallet: which chain, which account, how much HBAR.
 *
 * Everything here is the buyer's own wallet read live from the mirror node, so
 * two people running the app see two different balances. Clicking opens the
 * account on HashScan.
 */
export function WalletChip() {
  const { configured, accountId, hbar, loading, error } = useWallet();

  if (!configured || !accountId) {
    return (
      <span
        title="Set VITE_HEDERA_ACCOUNT_ID and VITE_HEDERA_PRIVATE_KEY in frontend/.env"
        className="inline-flex items-center gap-2 rounded-lg border border-amber/40 bg-amber/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-amber"
      >
        <span className="size-1.5 rounded-full bg-amber" />
        no wallet
      </span>
    );
  }

  return (
    <a
      href={hashscanAccount(accountId)}
      target="_blank"
      rel="noreferrer"
      title={`${accountId} on Hedera ${NETWORK} — open in HashScan`}
      className="group inline-flex items-center gap-3 rounded-lg border border-edge bg-white/[0.03] px-3 py-1.5 transition-colors hover:border-mint/50"
    >
      <span className="relative flex size-1.5 shrink-0">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint opacity-60" />
        <span className="relative inline-flex size-1.5 rounded-full bg-mint" />
      </span>

      <span className="hidden flex-col leading-none sm:flex">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-steel">
          hedera {NETWORK}
        </span>
        <span className="mt-1 font-mono text-[11px] text-ink">{accountId}</span>
      </span>

      <span className="font-mono text-[12.5px] font-bold tabular-nums text-mint">
        {loading && hbar === null ? "—" : error && hbar === null ? "—" : fmtHbar(hbar ?? 0)}
        <span className="ml-1 text-[10px] font-normal text-steel">HBAR</span>
      </span>

      <ExternalLink className="size-3 text-steel opacity-0 transition-opacity group-hover:opacity-100" />
    </a>
  );
}
