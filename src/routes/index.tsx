import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/Shell";
import { defaultTrip, saveTrip } from "@/lib/trip";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TravelPay AI — Autonomous Flight Agent on Hedera x402" },
      {
        name: "description",
        content:
          "Set your trip once. An AI agent pays for flight data with Hedera x402, finds the best deal, and you only sign to book.",
      },
      { property: "og:title", content: "TravelPay AI — Autonomous Flight Agent on Hedera x402" },
      {
        property: "og:description",
        content:
          "An AI agent that pays per API call with 0.01 HBAR, finds a matching flight, and asks you to sign only at booking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const fields = [
  { key: "from", label: "From" },
  { key: "to", label: "To" },
  { key: "depart", label: "Depart" },
  { key: "ret", label: "Return" },
] as const;

function Index() {
  const navigate = useNavigate();
  const [trip, setTrip] = useState(defaultTrip);

  return (
    <Shell>
      <section className="grid gap-6 py-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-mint">
            01 / 02 — preferences
          </p>
          <h1 className="mt-3 text-balance text-3xl font-semibold leading-none tracking-tight sm:text-4xl">
            Find my trip
          </h1>
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveTrip(trip);
              navigate({ to: "/activity" });
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              {fields.map((f) => (
                <label key={f.key} className="chip rounded-lg px-3 py-2.5">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.15em] text-steel">
                    {f.label}
                  </span>
                  <input
                    value={trip[f.key]}
                    onChange={(e) => setTrip({ ...trip, [f.key]: e.target.value })}
                    className="w-full bg-transparent text-sm font-medium text-ink outline-none"
                  />
                </label>
              ))}
            </div>
            <label className="chip flex items-center justify-between rounded-lg px-3 py-2.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-steel">
                Max budget
              </span>
              <span className="flex items-center font-mono text-sm font-bold text-ink">
                $
                <input
                  type="number"
                  value={trip.budget}
                  onChange={(e) => setTrip({ ...trip, budget: Number(e.target.value) })}
                  className="w-16 bg-transparent text-right font-mono text-sm font-bold text-ink outline-none"
                />
              </span>
            </label>
            <button
              type="submit"
              className="chrome bevel w-full rounded-lg py-3 font-mono text-sm font-bold uppercase tracking-[0.12em] text-void"
            >
              Start monitoring
            </button>
          </form>
        </div>

        <div className="lg:col-span-7">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-steel">
            live agent log
          </p>
          <div className="mt-3 rounded-xl border border-edge bg-log p-4 font-mono text-[13px] leading-relaxed">
            <div className="logline flex items-center gap-2 text-steel">
              <span className="size-1.5 rounded-full bg-mint" />
              travel preferences saved
            </div>
            <div className="logline flex items-center gap-2 text-steel">
              <span className="size-1.5 rounded-full bg-mint" />
              flight monitoring started
            </div>
            <div className="logline flex items-center gap-2 text-steel">
              <span className="size-1.5 rounded-full bg-mint" />
              connected to flight data api
            </div>
            <div className="logline flex items-center gap-2 text-ink">
              <span className="size-1.5 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-amber" />
              waiting for price signal
              <span className="ml-1 text-mint">…</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="chip rounded-lg p-3">
              <span className="block font-mono text-[10px] uppercase tracking-[0.15em] text-steel">
                Status
              </span>
              <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-mint">
                <span className="size-1.5 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-mint" />
                Monitoring
              </span>
            </div>
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
                Last check
              </span>
              <span className="mt-1 block font-mono text-sm text-steel">2m ago</span>
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}
