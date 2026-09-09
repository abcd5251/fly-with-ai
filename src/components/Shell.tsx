import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-void font-display text-ink">
      <header className="border-b border-edge bg-panel/70">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="chrome bevel grid size-8 place-items-center rounded-md font-mono text-xs font-bold text-void">
              402
            </div>
            <span className="font-mono text-sm tracking-tight">
              blocky<span className="text-mint">402</span> · autonomous travel
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.2em] text-steel sm:inline">
              hedera testnet
            </span>
            <span className="inline-flex items-center rounded-md bg-amber/15 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-amber ring-1 ring-amber/40">
              Demo mode
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-6">{children}</main>

      <footer className="border-t border-edge">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-5 font-mono text-[11px] text-steel">
          <span>autonomous commerce for ai agents</span>
          <span className="text-mint">x402 · hedera</span>
        </div>
      </footer>
    </div>
  );
}
