import { ExternalLink } from "lucide-react";
import { hashscanTx, shortId } from "@/lib/hedera-account";

/**
 * A transaction id, linked to HashScan when it is a real one.
 *
 * Holds fall back to locally generated stand-ins whenever the escrow contract
 * is unreachable, and the x402 fee leg has no id of its own yet. Those are
 * rendered as plain dim text — a link would only lead to a 404.
 */
export function TxLink({ tx, label }: { tx: string | null | undefined; label?: string }) {
  if (!tx) return null;
  const href = hashscanTx(tx);

  if (!href) {
    return (
      <span title={`${tx} — not on chain, no explorer entry`} className="text-steel/70">
        {label ? `${label} ` : ""}
        {shortId(tx)}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={`${tx} — open on HashScan`}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 text-mint/85 underline decoration-mint/30 underline-offset-2 transition-colors hover:text-mint hover:decoration-mint"
    >
      {label ? `${label} ` : ""}
      {shortId(tx)}
      <ExternalLink className="size-2.5" />
    </a>
  );
}
