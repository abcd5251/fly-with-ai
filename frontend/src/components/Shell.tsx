import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const steps = [
  { n: "01", label: "Travel request", to: "/" as const },
  { n: "02", label: "Matched flight", to: "/flight" as const },
];

export function Shell({ children, step }: { children: ReactNode; step?: 1 | 2 }) {
  return (
    <div className="flex min-h-screen flex-col bg-void font-display text-ink">
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
            <Link
              to="/escrow"
              className="hidden font-mono text-[11px] uppercase tracking-[0.2em] text-steel transition-colors hover:text-mint sm:inline"
            >
              escrow vault
            </Link>
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.2em] text-steel sm:inline">
              hedera testnet
            </span>
            <span className="inline-flex items-center rounded-md bg-amber/15 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-amber ring-1 ring-amber/40">
              Demo mode
            </span>
          </div>
        </div>

        {step && (
          <div className="border-t border-edge/70">
            <nav className="mx-auto flex max-w-[1180px] items-center gap-2 px-6 py-2.5">
              {steps.map((s, i) => {
                const active = i + 1 === step;
                const done = i + 1 < step;
                return (
                  <div key={s.n} className="flex items-center gap-2">
                    {i > 0 && <span className="mr-1 h-px w-6 bg-edge sm:w-10" />}
                    <Link
                      to={s.to}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[11px] transition-colors ${
                        active
                          ? "bg-mint/15 font-bold text-mint ring-1 ring-mint/35"
                          : "text-steel hover:text-ink"
                      }`}
                    >
                      <span
                        className={`grid size-4 place-items-center rounded-full text-[9px] font-bold ${
                          active || done ? "bg-mint text-void" : "bg-edge text-steel"
                        }`}
                      >
                        {done ? "✓" : s.n.slice(-1)}
                      </span>
                      {s.label}
                    </Link>
                  </div>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-[1180px] flex-1 px-6">{children}</main>

      <footer className="border-t border-edge">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-5 font-mono text-[11px] text-steel">
          <span>autonomous commerce for ai agents</span>
          <span className="text-mint">x402 · hedera</span>
        </div>
      </footer>
    </div>
  );
}
