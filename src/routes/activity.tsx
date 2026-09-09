import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { defaultTrip, loadTrip, matchedFlight, type Trip } from "@/lib/trip";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Agent Activity — x402 Payment Log | TravelPay AI" },
      {
        name: "description",
        content:
          "Watch the AI agent hit HTTP 402, pay 0.01 HBAR through Blocky402 on Hedera Testnet, and unlock flight data in real time.",
      },
      { property: "og:title", content: "Agent Activity — x402 Payment Log" },
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
  { t: "00:00", text: "travel preferences saved", tone: "ok" },
  { t: "00:02", text: "flight monitoring started", tone: "ok" },
  { t: "00:04", text: "POST /api/flights/search", tone: "ok" },
  { t: "00:06", text: "HTTP 402 · payment required", tone: "warn" },
  { t: "00:07", text: "paying 0.01 HBAR via x402", tone: "pay" },
  { t: "00:09", text: "blocky402 facilitator verified", tone: "pay" },
  { t: "00:10", text: "hedera testnet tx confirmed", tone: "ok" },
  { t: "00:11", text: "200 OK · 12 flight options received", tone: "ok" },
  { t: "00:13", text: "analyzing price · time · stops", tone: "ok" },
  { t: "00:15", text: "match found · ANA $428", tone: "hit" },
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
    const id = setTimeout(() => setStep((s) => s + 1), step === 0 ? 400 : 900);
    return () => clearTimeout(id);
  }, [step]);

  const paid = step > 6;
  const matched = step >= 10;
  const emailed = step >= 11;

  return (
    <Shell>
      <section className="grid gap-6 py-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-mint">
            02 — agent activity
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-none tracking-tight">
            AI agent at work
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
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-steel">agent state</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="chip rounded-lg p-3">
              <span className="block font-mono text-[10px] uppercase tracking-[0.15em] text-steel">
                Route
              </span>
              <span className="mt-1 block text-sm font-medium text-ink">
                {trip.from} → {trip.to}
              </span>
            </div>
            <div className="chip rounded-lg p-3">
              <span className="block font-mono text-[10px] uppercase tracking-[0.15em] text-steel">
                Budget
              </span>
              <span className="mt-1 block font-mono text-sm font-bold text-ink">
                ${trip.budget}
              </span>
            </div>
            <div className="chip rounded-lg p-3">
              <span className="block font-mono text-[10px] uppercase tracking-[0.15em] text-steel">
                Data paid
              </span>
              <span className="mt-1 block font-mono text-sm text-mint">
                {paid ? "0.01 HBAR" : "—"}
              </span>
            </div>
            <div className="chip rounded-lg p-3">
              <span className="block font-mono text-[10px] uppercase tracking-[0.15em] text-steel">
                Status
              </span>
              <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-mint">
                <span className="size-1.5 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-mint" />
                {matched ? "Match found" : "Monitoring"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {paid && (
        <section className="payflash relative overflow-hidden rounded-2xl border border-mint/40 bg-[#0c1613] p-6 sm:p-8">
          <div
            className="pointer-events-none absolute inset-0 -z-0 opacity-40"
            style={{
              background:
                "radial-gradient(60% 120% at 80% 0%, rgba(70,240,192,.18), transparent 70%)",
            }}
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-mint">
                03 — the payment moment
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
                <span className="font-mono text-2xl font-bold text-ink">HTTP 402</span>
                <span className="font-mono text-sm text-steel">Payment Required</span>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2 font-mono text-xs">
                <span className="rounded bg-mint/15 px-2.5 py-1 font-bold text-mint">0.01 HBAR</span>
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
            {matched && (
              <div className="w-full lg:w-[360px]">
                <div className="chrome bevel rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-steel">
                      matched flight
                    </span>
                    <span className="font-mono text-[10px] font-bold text-void">
                      {matchedFlight.airline} · {matchedFlight.code}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-void">
                    <div>
                      <span className="font-mono text-2xl font-bold">{matchedFlight.fromCode}</span>
                      <span className="block text-[11px] font-medium opacity-70">
                        {trip.from} · {matchedFlight.departTime}
                      </span>
                    </div>
                    <div className="flex-1 px-4 text-center">
                      <span className="block font-mono text-[10px] opacity-70">
                        direct · {matchedFlight.duration}
                      </span>
                      <span className="mx-auto block h-px w-full bg-void/40" />
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-2xl font-bold">{matchedFlight.toCode}</span>
                      <span className="block text-[11px] font-medium opacity-70">
                        {trip.to} · {matchedFlight.arriveTime}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-void/15 pt-3">
                    <span className="font-mono text-[11px] font-medium opacity-70">
                      ${matchedFlight.price} · within ${trip.budget}
                    </span>
                    <span className="font-mono text-lg font-bold">${matchedFlight.price}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {emailed && (
        <section className="py-12 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-mint">
            03 — email sent
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            We found a flight for you ✈️
          </h2>
          <p className="mt-2 font-mono text-sm text-steel">
            notification sent · {matchedFlight.airline} {matchedFlight.flightNo} · $
            {matchedFlight.price}
          </p>
          <Link
            to="/flight"
            className="chrome bevel mt-6 inline-block rounded-lg px-10 py-3 font-mono text-sm font-bold uppercase tracking-[0.12em] text-void"
          >
            View matched flight
          </Link>
        </section>
      )}
    </Shell>
  );
}
