import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type CSSProperties } from "react";
import {
  Activity,
  ArrowLeft,
  Check,
  Coins,
  ExternalLink,
  Landmark,
  Lock,
  RefreshCcw,
  ShieldCheck,
  Timer,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Shell } from "@/components/Shell";
import { useCountdown } from "@/hooks/use-countdown";
import { fetchEscrow, type EscrowEntry, type EscrowSnapshot } from "@/lib/api";
import { fmtCountdown, shortTx } from "@/lib/hold";
import { hbar } from "@/lib/trip";

export const Route = createFileRoute("/escrow")({
  head: () => ({
    meta: [
      { title: "Escrow Vault — Seat Deposits on Hedera | fly402" },
      {
        name: "description",
        content:
          "Every seat an agent holds parks a refundable deposit in the HoldEscrow contract. Live TVL, the holds behind it, and why this settles on Hedera.",
      },
      { property: "og:title", content: "Escrow Vault — Seat Deposits on Hedera" },
      {
        property: "og:description",
        content: "Recurring, high-velocity TVL from machine-bought seat options.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EscrowPage,
});

const empty: EscrowSnapshot = {
  tvl: 0,
  active: 0,
  totals: {
    opened: 0,
    settled: 0,
    released: 0,
    expired: 0,
    feesPaid: 0,
    depositsSettled: 0,
    depositsRefunded: 0,
  },
  avgWindowHours: 24,
  avgHeldMinutes: 0,
  contract: { address: null, network: "hedera-testnet", explorer: null, deployed: false },
  entries: [],
};

const statusStyle: Record<EscrowEntry["status"], string> = {
  held: "bg-mint/15 text-mint",
  settled: "bg-white/10 text-ink",
  released: "bg-white/[0.06] text-steel",
  expired: "bg-amber/15 text-amber",
};

function HoldRow({ e }: { e: EscrowEntry }) {
  const left = useCountdown(e.status === "held" ? e.expiresAt : null);
  return (
    <tr className="border-t border-edge">
      <td className="py-3 pl-4 pr-3">
        <span className="font-mono text-[12px] text-ink">{e.id}</span>
        <span className="mt-0.5 block font-mono text-[10.5px] text-steel">{e.chain}</span>
      </td>
      <td className="px-3 py-3">
        <span className="text-[13px] font-medium text-ink">
          {e.airline} {e.flightNo}
        </span>
        <span className="mt-0.5 block font-mono text-[10.5px] text-steel">{e.route}</span>
      </td>
      <td className="px-3 py-3 text-right font-mono text-[13px] font-bold text-mint">
        {hbar(e.deposit)}
      </td>
      <td className="px-3 py-3 text-right font-mono text-[12px] text-steel">{hbar(e.fee)}</td>
      <td className="px-3 py-3">
        <span
          className={`inline-block rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] ${statusStyle[e.status]}`}
        >
          {e.status}
        </span>
      </td>
      <td className="px-3 py-3 font-mono text-[11.5px] text-steel">
        {e.status === "held" ? (
          <span className="inline-flex items-center gap-1.5 text-ink">
            <Timer className="size-3.5 text-mint" />
            {fmtCountdown(left)}
          </span>
        ) : (
          shortTx(e.settleTx ?? e.refundTx ?? e.depositTx)
        )}
      </td>
    </tr>
  );
}

function EscrowPage() {
  const [vault, setVault] = useState<EscrowSnapshot>(empty);
  const [reachable, setReachable] = useState(true);

  // holds expire on their own — keep the vault honest while the page is open
  useEffect(() => {
    let alive = true;
    const pull = () =>
      fetchEscrow()
        .then((v) => alive && (setVault(v), setReachable(true)))
        .catch(() => alive && setReachable(false));
    pull();
    const id = setInterval(pull, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // what this looks like at scale
  const [holdsPerDay, setHoldsPerDay] = useState(5000);
  const [avgDeposit, setAvgDeposit] = useState(0.4);
  const [windowHours, setWindowHours] = useState(24);

  const projectedTvl = holdsPerDay * avgDeposit * (windowHours / 24);
  const yearlyFlow = holdsPerDay * avgDeposit * 365;
  const txPerDay = holdsPerDay * 2;
  const velocity = (365 * 24) / windowHours;
  const feeCost = txPerDay * 0.0001 * 365;

  const c = vault.contract;

  const stats = [
    { icon: Landmark, k: "Locked now", v: hbar(vault.tvl), tone: "mint" },
    { icon: Lock, k: "Active holds", v: String(vault.active) },
    { icon: Timer, k: "Avg window", v: `${vault.avgWindowHours}h` },
    { icon: RefreshCcw, k: "Refunded", v: hbar(vault.totals.depositsRefunded) },
    { icon: Check, k: "Settled to sellers", v: hbar(vault.totals.depositsSettled) },
    { icon: Coins, k: "Fees paid · x402", v: hbar(vault.totals.feesPaid) },
  ];

  return (
    <Shell>
      <section className="py-10">
        <Link
          to="/flight"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-steel transition-colors hover:text-mint"
        >
          <ArrowLeft className="size-3.5" />
          Back to the flight
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-mint">
              hold escrow · deposit vault
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
              Every held seat
              <br />
              parks value on Hedera.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-steel">
              The hold fee is a one-way x402 payment. The <span className="text-ink">deposit</span>{" "}
              is different — it sits in the HoldEscrow contract until the traveller books, passes,
              or the clock runs out. Deposits are short-lived and recycle constantly, so the vault
              is <span className="text-ink">working capital, not idle TVL</span>.
            </p>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-mint/40 bg-mint/[0.06] p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-steel">
                Total value locked
              </p>
              <p className="mt-1 font-mono text-5xl font-bold tabular-nums text-mint">
                {hbar(vault.tvl)}
              </p>
              <p className="mt-2 font-mono text-[11.5px] text-steel">
                across {vault.active} live {vault.active === 1 ? "hold" : "holds"} ·{" "}
                {vault.totals.opened} opened all-time
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-mint/20 pt-4">
                <span
                  className={`inline-flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] ${
                    c.deployed ? "bg-mint/20 text-mint" : "bg-amber/15 text-amber"
                  }`}
                >
                  <ShieldCheck className="size-3.5" />
                  {c.deployed ? `settling on ${c.network}` : "ledger mirrored off-chain"}
                </span>
                {c.explorer ? (
                  <a
                    href={c.explorer}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono text-[11px] text-steel transition-colors hover:text-mint"
                  >
                    {shortTx(c.address ?? "")}
                    <ExternalLink className="size-3" />
                  </a>
                ) : (
                  <span className="font-mono text-[11px] text-steel">
                    deploy HoldEscrow.sol to go live
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* vault stats */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((s) => (
            <div key={s.k} className="chip rounded-xl p-3.5">
              <s.icon className={`size-4 ${s.tone === "mint" ? "text-mint" : "text-mint/70"}`} />
              <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-steel">
                {s.k}
              </p>
              <p
                className={`mt-0.5 font-mono text-[15px] font-bold tabular-nums ${
                  s.tone === "mint" ? "text-mint" : "text-ink"
                }`}
              >
                {s.v}
              </p>
            </div>
          ))}
        </div>
        {!reachable && (
          <p className="mt-3 font-mono text-[11px] text-amber">
            seller offline — start it with `npm run dev` in backend/seller to see live vault data
          </p>
        )}
      </section>

      {/* the holds behind the number */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-xl font-semibold tracking-tight">
            What's in the vault
            <span className="ml-2 font-mono text-[12px] font-normal text-steel">
              every row is one deposit
            </span>
          </h2>
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-steel">
            <Activity className="size-3.5 text-mint" />
            refreshing every 5s
          </span>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-edge bg-panel">
          <table className="w-full min-w-[680px] border-collapse">
            <thead>
              <tr className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-steel">
                <th className="py-3 pl-4 pr-3 text-left font-medium">Hold</th>
                <th className="px-3 py-3 text-left font-medium">Flight</th>
                <th className="px-3 py-3 text-right font-medium">Deposit</th>
                <th className="px-3 py-3 text-right font-medium">Fee</th>
                <th className="px-3 py-3 text-left font-medium">Status</th>
                <th className="px-3 py-3 text-left font-medium">Expires / tx</th>
              </tr>
            </thead>
            <tbody>
              {vault.entries.length === 0 ? (
                <tr className="border-t border-edge">
                  <td colSpan={6} className="px-4 py-8 text-center text-[13px] text-steel">
                    No deposits yet — hold a seat on{" "}
                    <Link to="/flight" className="text-mint hover:underline">
                      step 02
                    </Link>{" "}
                    and it shows up here.
                  </td>
                </tr>
              ) : (
                vault.entries.map((e) => <HoldRow key={e.id} e={e} />)
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* what it looks like at scale */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">
          At scale
          <span className="ml-2 font-mono text-[12px] font-normal text-steel">
            drag the assumptions
          </span>
        </h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-12">
          <div className="rounded-2xl border border-edge bg-panel p-6 lg:col-span-7">
            {[
              {
                label: "Seats held per day",
                value: holdsPerDay,
                set: setHoldsPerDay,
                min: 100,
                max: 50000,
                step: 100,
                fmt: (n: number) => n.toLocaleString("en-US"),
              },
              {
                label: "Average deposit",
                value: avgDeposit,
                set: setAvgDeposit,
                min: 0.1,
                max: 5,
                step: 0.1,
                fmt: (n: number) => hbar(n),
              },
              {
                label: "Average hold window",
                value: windowHours,
                set: setWindowHours,
                min: 1,
                max: 72,
                step: 1,
                fmt: (n: number) => `${n}h`,
              },
            ].map((s) => (
              <label key={s.label} className="mb-5 block last:mb-0">
                <span className="flex items-baseline justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-steel">
                    {s.label}
                  </span>
                  <span className="font-mono text-lg font-bold tabular-nums text-ink">
                    {s.fmt(s.value)}
                  </span>
                </span>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={s.value}
                  onChange={(e) => s.set(Number(e.target.value))}
                  aria-label={s.label}
                  className="range mt-3 w-full"
                  style={
                    {
                      "--fill": `${((s.value - s.min) / (s.max - s.min)) * 100}%`,
                    } as CSSProperties
                  }
                />
              </label>
            ))}
            <p className="mt-6 border-t border-edge pt-4 font-mono text-[11px] leading-relaxed text-steel">
              Defaults are one mid-size OTA&apos;s daily volume. The deposit is never the
              platform&apos;s money — it is the traveller&apos;s, and it leaves the contract only
              through settle or refund.
            </p>
          </div>

          <div className="grid gap-3 lg:col-span-5">
            <div className="rounded-2xl border border-mint/40 bg-mint/[0.06] p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-steel">
                Steady-state TVL
              </p>
              <p className="mt-1 font-mono text-4xl font-bold tabular-nums text-mint">
                {Math.round(projectedTvl).toLocaleString("en-US")}
                <span className="ml-1.5 text-lg text-steel">HBAR</span>
              </p>
              <p className="mt-2 font-mono text-[11.5px] leading-relaxed text-steel">
                holds/day × deposit × window ÷ 24 — locked at any moment, recycling{" "}
                <span className="text-ink">{Math.round(velocity)}×</span> a year
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="chip rounded-xl p-4">
                <TrendingUp className="size-4 text-mint/80" />
                <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-steel">
                  Deposit flow / yr
                </p>
                <p className="mt-0.5 font-mono text-[15px] font-bold tabular-nums text-ink">
                  {(yearlyFlow / 1_000_000).toFixed(1)}M HBAR
                </p>
              </div>
              <div className="chip rounded-xl p-4">
                <Zap className="size-4 text-mint/80" />
                <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-steel">
                  Contract calls / day
                </p>
                <p className="mt-0.5 font-mono text-[15px] font-bold tabular-nums text-ink">
                  {txPerDay.toLocaleString("en-US")}
                </p>
              </div>
            </div>
            <p className="font-mono text-[11px] leading-relaxed text-steel">
              At Hedera's fixed ~$0.0001 per call that is{" "}
              <span className="text-mint">${Math.round(feeCost).toLocaleString("en-US")}</span> of
              network fees a year — on a chain with variable gas, a $2 hold fee stops covering its
              own settlement the first time the network gets busy.
            </p>
          </div>
        </div>
      </section>

      {/* why this settles here */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">Why it settles on Hedera</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            {
              icon: Coins,
              title: "Settlement cost stays flat",
              body: "A hold earns the seller a fraction of an HBAR. Settlement has to cost a rounding error and keep costing one — a gas spike would make the whole product unsellable.",
              hook: "open() + refund() ≈ $0.0002 total",
            },
            {
              icon: Timer,
              title: "Finality inside the quote window",
              body: "The seat is soft-locked for 90 seconds. The deposit has to be provably locked before that runs out, or the agent loses the seat it just paid a fee for.",
              hook: "~3s to finality",
            },
            {
              icon: RefreshCcw,
              title: "Refunds nobody has to babysit",
              body: "After expiry anyone can call refund(), and a scheduled transaction can fire it on the deadline. No keeper bot, no seller cooperation, no stranded deposits.",
              hook: "refund() is permissionless after expiry",
            },
            {
              icon: Landmark,
              title: "TVL that actually turns over",
              body: "Deposits arrive and leave every day rather than sitting still. The same balance sheet gets reused hundreds of times a year, and each turn is two contract calls.",
              hook: `${Math.round(velocity)} turns / year at a ${windowHours}h window`,
            },
          ].map((s) => (
            <div key={s.title} className="rounded-2xl border border-edge bg-panel p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-mint/10 text-mint ring-1 ring-mint/25">
                  <s.icon className="size-4" />
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-ink">{s.title}</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-steel">{s.body}</p>
                  <p className="mt-2.5 font-mono text-[11px] text-mint">{s.hook}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* the contract itself */}
      <section className="mt-12 mb-16">
        <h2 className="text-xl font-semibold tracking-tight">
          The contract
          <span className="ml-2 font-mono text-[12px] font-normal text-steel">
            contracts/src/HoldEscrow.sol
          </span>
        </h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <pre className="overflow-x-auto rounded-2xl border border-edge bg-log p-5 font-mono text-[12.5px] leading-relaxed text-[#c3ccd8]">
            <code>{`open(id, seller, expiresAt) payable
  agent locks the deposit, window ≤ 7 days

settle(id)
  payer only, before expiry → seller

refund(id)
  payer any time
  anyone once expired → payer

stats() → (locked, settled, refunded, opened)`}</code>
          </pre>
          <div className="rounded-2xl border border-edge bg-panel p-5">
            <p className="text-[13px] leading-relaxed text-steel">
              No owner, no pause, no upgrade path. The seller can never pull funds, and after the
              window ends the refund is callable by anyone — so a seller that goes offline cannot
              strand a traveller&apos;s deposit. That property is the whole reason a traveller lets
              an agent spend on their behalf.
            </p>
            <div className="mt-4 rounded-xl border border-edge bg-log p-4 font-mono text-[11.5px] leading-relaxed text-steel">
              <span className="text-steel/70"># deploy to Hedera testnet</span>
              <br />
              cd contracts && npm install
              <br />
              cp .env.example .env <span className="text-steel/70">← funded ECDSA key</span>
              <br />
              npm run deploy:hedera
              <br />
              <br />
              <span className="text-steel/70"># then in backend/seller/.env</span>
              <br />
              <span className="text-mint">HEDERA_ESCROW_ADDRESS=0x…</span>
            </div>
            <p className="mt-3 font-mono text-[11px] text-steel">
              This page reads the address from the seller — deploy it and the badge above flips to{" "}
              <span className="text-mint">settling on hedera-testnet</span> with HashScan links on
              every row.
            </p>
          </div>
        </div>
      </section>
    </Shell>
  );
}
