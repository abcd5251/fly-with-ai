import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Shell } from "@/components/Shell";
import { agentRun, defaultTrip, loadTrip, matchedFlight, money, type Trip } from "@/lib/trip";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Agent Log — x402 Payment Trail | TravelPay AI" },
      {
        name: "description",
        content:
          "The audit trail behind the email: HTTP 402, 0.01 HBAR paid through Blocky402 on Hedera Testnet, flight data unlocked.",
      },
      { property: "og:title", content: "Agent Log — x402 Payment Trail" },
      {
        property: "og:description",
        content: "HTTP 402 → 0.01 HBAR → Blocky402 → Hedera confirmed → flight data unlocked.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Activity,
});

type Line = { t: string; text: string; tone: "ok" | "warn" | "pay" | "hit" };

const script: Line[] = [
  { t: "00:00", text: "travel request saved", tone: "ok" },
  { t: "00:02", text: "flight monitoring started", tone: "ok" },
  { t: "00:04", text: "POST /api/flights/search", tone: "ok" },
  { t: "00:06", text: "HTTP 402 · payment required", tone: "warn" },
  { t: "00:07", text: "paying 0.01 HBAR via x402", tone: "pay" },
  { t: "00:09", text: "blocky402 facilitator verified", tone: "pay" },
  { t: "00:10", text: "hedera testnet tx confirmed", tone: "ok" },
  { t: "00:11", text: "200 OK · 12 flight options received", tone: "ok" },
  { t: "00:13", text: "analyzing price · time · stops · co2", tone: "ok" },
  {
    t: "00:15",
    text: `match found · ${matchedFlight.airline} ${money(matchedFlight.price)}`,
    tone: "hit",
  },
  { t: "00:16", text: "email notification sent", tone: "hit" },
];

const toneDot: Record<Line["tone"], string> = {
  ok: "bg-mint",
  warn: "bg-danger",
  pay: "bg-amber",
  hit: "bg-mint",
};
const toneText: Record<Line["tone"], string> = {
  ok: "text-steel",
  warn: "font-bold text-danger",
  pay: "text-ink",
  hit: "font-bold text-mint",
};

function Activity() {
  const [trip, setTrip] = useState<Trip>(defaultTrip);
  const [step, setStep] = useState(0);

  useEffect(() => setTrip(loadTrip()), []);

  useEffect(() => {
    if (step >= script.length) return;
    const id = setTimeout(() => setStep((s) => s + 1), step === 0 ? 300 : 420);
    return () => clearTimeout(id);
  }, [step]);

  const paid = step > 6;

  return (
    <Shell>
      <section className="grid gap-6 py-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Link
            to="/flight"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-steel transition-colors hover:text-mint"
          >
            <ArrowLeft className="size-3.5" />
            Back to matched flight
          </Link>
          <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.25em] text-mint">
            audit trail
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-none tracking-tight">
            How the agent paid for this
          </h1>
          <div className="mt-5 rounded-xl border border-edge bg-log p-4 font-mono text-[13px] leading-relaxed">
            {script.slice(0, step).map((l) => (
              <div key={l.t} className="logline flex items-center gap-3">
                <span className={`size-1.5 rounded-full ${toneDot[l.tone]}`} />
                <span className="text-steel/70">{l.t}</span>
                <span className={toneText[l.tone]}>{l.text}</span>
              </div>
            ))}
            {step < script.length && (
              <div className="flex items-center gap-2 text-ink">
                <span className="size-1.5 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-amber" />
                working<span className="text-mint">…</span>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-steel">
            agent state
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[
              { k: "Route", v: `${trip.fromCode} → ${trip.toCode}` },
              { k: "Budget", v: money(trip.budget) },
              { k: "Data paid", v: paid ? `${agentRun.paid} HBAR` : "—" },
              { k: "Network", v: agentRun.network },
            ].map((s) => (
              <div key={s.k} className="chip rounded-xl p-3">
                <span className="block font-mono text-[10px] uppercase tracking-[0.15em] text-steel">
                  {s.k}
                </span>
                <span className="mt-1 block font-mono text-sm font-bold text-ink">{s.v}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 font-mono text-[10px] text-steel">tx {agentRun.txId}</p>
        </div>
      </section>

      {paid && (
        <section className="payflash relative mb-12 overflow-hidden rounded-2xl border border-mint/40 bg-[#0c1613] p-6 sm:p-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(60% 120% at 80% 0%, rgba(70,240,192,.18), transparent 70%)",
            }}
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-mint">
                the payment moment
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
                <span className="font-mono text-2xl font-bold text-ink">HTTP 402</span>
                <span className="font-mono text-sm text-steel">Payment Required</span>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2 font-mono text-xs">
                <span className="rounded bg-mint/15 px-2.5 py-1 font-bold text-mint">
                  0.01 HBAR
                </span>
                <span className="text-steel">→</span>
                <span className="rounded bg-white/5 px-2.5 py-1 text-ink">Blocky402</span>
                <span className="text-steel">→</span>
                <span className="rounded bg-white/5 px-2.5 py-1 text-ink">Hedera</span>
                <span className="text-steel">→</span>
                <span className="inline-flex items-center gap-1.5 rounded bg-mint/15 px-2.5 py-1 font-bold text-mint">
                  <span className="size-1.5 rounded-full bg-mint" />
                  confirmed
                </span>
              </div>
            </div>
            <Link
              to="/flight"
              className="chrome bevel inline-flex items-center gap-2 rounded-lg px-8 py-3 font-mono text-sm font-bold uppercase tracking-[0.12em] text-void"
            >
              See the matched flight
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </section>
      )}
    </Shell>
  );
}
