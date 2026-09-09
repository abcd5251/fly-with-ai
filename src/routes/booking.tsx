import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { defaultTrip, loadTrip, matchedFlight, type Trip } from "@/lib/trip";

export const Route = createFileRoute("/booking")({
  head: () => ({
    meta: [
      { title: "Confirm & Sign — Book Your Flight | TravelPay AI" },
      {
        name: "description",
        content:
          "Your AI agent already evaluated this flight. Sign once on Hedera to confirm the booking.",
      },
      { property: "og:title", content: "Confirm & Sign — Book Your Flight" },
      {
        property: "og:description",
        content: "One signature confirms the booking the agent found for you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Booking,
});

function Booking() {
  const [trip, setTrip] = useState<Trip>(defaultTrip);
  const [state, setState] = useState<"ready" | "signing" | "done">("ready");

  useEffect(() => setTrip(loadTrip()), []);

  useEffect(() => {
    if (state !== "signing") return;
    const id = setTimeout(() => setState("done"), 1800);
    return () => clearTimeout(id);
  }, [state]);

  return (
    <Shell>
      <section className="grid gap-6 py-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-mint">
            {state === "done" ? "06 — booked" : "06 — confirm"}
          </p>
          <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-tight">
            {state === "done" ? "🎉 Booking confirmed" : "Ready to book"}
          </h1>
          <div className="mt-5 rounded-xl border border-edge bg-panel p-5 font-mono text-sm">
            <div className="flex justify-between py-1.5">
              <span className="text-steel">Airline</span>
              <span className="text-ink">{matchedFlight.airline} · direct</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-steel">Route</span>
              <span className="text-ink">
                {matchedFlight.fromCode} → {matchedFlight.toCode}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-steel">Dates</span>
              <span className="text-ink">
                {trip.depart} – {trip.ret}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-steel">Settlement</span>
              <span className="text-ink">Hedera</span>
            </div>
            <div className="flex justify-between border-t border-edge py-1.5">
              <span className="text-steel">Total</span>
              <span className="font-bold text-mint">${matchedFlight.price}</span>
            </div>
          </div>

          {state === "done" ? (
            <div className="mt-5 rounded-lg border border-mint/40 bg-mint/10 px-4 py-3 font-mono text-[13px] text-mint">
              ✓ payment confirmed · hedera tx 0.0.4821·1729
            </div>
          ) : (
            <button
              disabled={state === "signing"}
              onClick={() => setState("signing")}
              className="chrome bevel mt-5 w-full rounded-lg py-3 font-mono text-sm font-bold uppercase tracking-[0.12em] text-void disabled:opacity-60"
            >
              {state === "signing" ? "signing…" : "Confirm & sign"}
            </button>
          )}
          <p className="mt-3 font-mono text-[11px] text-steel">
            Sign once — the agent handled the rest.
          </p>
        </div>

        <div className="lg:col-span-7">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-steel">
            agent journey
          </p>
          <ol className="mt-3 space-y-2 font-mono text-[13px]">
            <li className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5 text-ink">
              <span className="text-mint">✓</span>Monitored flights
            </li>
            <li className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5 text-ink">
              <span className="text-mint">✓</span>Paid 0.01 HBAR for data
            </li>
            <li className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5 text-ink">
              <span className="text-mint">✓</span>Found matching flight
            </li>
            <li className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5 text-ink">
              <span className="text-mint">✓</span>Sent notification
            </li>
            <li
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
                state === "done" ? "bg-mint/10 font-bold text-mint" : "bg-white/5 text-steel"
              }`}
            >
              <span>{state === "done" ? "✓" : "•"}</span>Booking confirmed
            </li>
          </ol>
        </div>
      </section>
    </Shell>
  );
}
