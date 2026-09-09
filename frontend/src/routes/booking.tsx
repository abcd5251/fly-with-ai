import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { Shell } from "@/components/Shell";
import {
  agentRun,
  defaultTrip,
  fmtDate,
  flightById,
  loadSelection,
  loadTrip,
  matchedFlight,
  money,
  returnLegFor,
  type Trip,
} from "@/lib/trip";

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
  const [flightId, setFlightId] = useState(matchedFlight.id);
  const [fareIndex, setFareIndex] = useState(1);
  const [state, setState] = useState<"ready" | "signing" | "done">("ready");

  useEffect(() => {
    setTrip(loadTrip());
    const sel = loadSelection();
    setFlightId(sel.flightId);
    setFareIndex(sel.fareIndex);
  }, []);

  useEffect(() => {
    if (state !== "signing") return;
    const id = setTimeout(() => setState("done"), 1800);
    return () => clearTimeout(id);
  }, [state]);

  const f = flightById(flightId);
  const back = returnLegFor(f.id);
  const fare = f.fares[fareIndex] ?? f.fares[0]!;
  const total = (f.price + fare.delta) * trip.passengers;

  return (
    <Shell>
      <section className="grid gap-6 py-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Link
            to="/flight"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-steel transition-colors hover:text-mint"
          >
            <ArrowLeft className="size-3.5" />
            Back to flight details
          </Link>
          <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.25em] text-mint">
            {state === "done" ? "booked" : "confirm & sign"}
          </p>
          <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-tight">
            {state === "done" ? "🎉 Booking confirmed" : "Ready to book"}
          </h1>

          <div className="mt-5 rounded-xl border border-edge bg-panel p-5 font-mono text-[13px]">
            {[
              { k: "Airline", v: `${f.airline} · ${f.stops === 0 ? "direct" : `${f.stops} stop`}` },
              { k: "Flights", v: `${f.flightNo} / ${back.flightNo}` },
              { k: "Route", v: `${f.fromCode} → ${f.toCode}` },
              { k: "Dates", v: `${fmtDate(trip.depart)} – ${fmtDate(trip.ret)}` },
              { k: "Travellers", v: `${trip.passengers} · ${f.cabin}` },
              { k: "Fare", v: `${fare.name}` },
              { k: "Settlement", v: agentRun.network },
            ].map((s) => (
              <div key={s.k} className="flex justify-between py-1.5">
                <span className="text-steel">{s.k}</span>
                <span className="text-ink">{s.v}</span>
              </div>
            ))}
            <div className="mt-1 flex justify-between border-t border-edge pt-2.5">
              <span className="text-steel">Total</span>
              <span className="text-base font-bold text-mint">{money(total)}</span>
            </div>
          </div>

          {state === "done" ? (
            <div className="mt-5 rounded-lg border border-mint/40 bg-mint/10 px-4 py-3 font-mono text-[13px] text-mint">
              ✓ payment confirmed · tx {agentRun.txId}
            </div>
          ) : (
            <button
              disabled={state === "signing"}
              onClick={() => setState("signing")}
              className="chrome bevel mt-5 w-full rounded-xl py-3.5 font-mono text-sm font-bold uppercase tracking-[0.12em] text-void disabled:opacity-60"
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
            {[
              "Monitored fares for your request",
              `Paid ${agentRun.paid} HBAR for flight data`,
              `Found ${f.airline} ${f.flightNo} at ${money(f.price)}`,
              `Emailed ${trip.email}`,
            ].map((s) => (
              <li
                key={s}
                className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5 text-ink"
              >
                <Check className="size-3.5 shrink-0 text-mint" />
                {s}
              </li>
            ))}
            <li
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
                state === "done" ? "bg-mint/10 font-bold text-mint" : "bg-white/5 text-steel"
              }`}
            >
              {state === "done" ? (
                <Check className="size-3.5 shrink-0" />
              ) : (
                <span className="size-3.5 text-center">•</span>
              )}
              Booking confirmed
            </li>
          </ol>
        </div>
      </section>
    </Shell>
  );
}
