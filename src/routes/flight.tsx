import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { defaultTrip, loadTrip, matchedFlight, type Trip } from "@/lib/trip";

export const Route = createFileRoute("/flight")({
  head: () => ({
    meta: [
      { title: "Matched Flight — Details & Fare Options | TravelPay AI" },
      {
        name: "description",
        content:
          "The flight your AI agent found and paid 0.01 HBAR to unlock — full schedule, baggage, and fare options. One signature books it.",
      },
      { property: "og:title", content: "Matched Flight — Details & Fare Options" },
      {
        property: "og:description",
        content: "Full flight details matched by your autonomous agent on Hedera x402.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Flight,
});

const fares = [
  {
    name: "Basic",
    price: 0,
    perks: ["Carry-on 1 × 7kg", "No checked bag", "Non-refundable"],
    best: false,
  },
  {
    name: "Standard",
    price: 46,
    perks: ["Checked bag 1 × 23kg", "Free cancellation · 24h", "Changes from $40"],
    best: true,
  },
  {
    name: "Flex",
    price: 112,
    perks: ["Free cancellation anytime", "Free changes", "Priority boarding"],
    best: false,
  },
];

function Flight() {
  const [trip, setTrip] = useState<Trip>(defaultTrip);
  const [fare, setFare] = useState(1);

  useEffect(() => setTrip(loadTrip()), []);

  const f = matchedFlight;
  const total = f.price + fares[fare].price;

  return (
    <Shell>
      <section className="py-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-mint">
          03 — matched flight
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-3xl font-semibold leading-none tracking-tight">
            {trip.from} → {trip.to}
          </h1>
          <p className="font-mono text-xs text-steel">
            {trip.depart} · direct · {f.duration}
          </p>
        </div>

        {/* email banner */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-mint/40 bg-mint/10 px-4 py-3">
          <p className="font-mono text-[13px] text-mint">
            ✓ email sent · agent paid 0.01 HBAR to unlock this data
          </p>
          <span className="font-mono text-[11px] text-steel">hedera tx 0.0.4821·1729</span>
        </div>

        {/* flight card — like a search result row, expanded */}
        <div className="mt-5 rounded-2xl border border-edge bg-panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="chrome bevel grid size-10 place-items-center rounded-md font-mono text-xs font-bold text-void">
                {f.code}
              </div>
              <div>
                <p className="font-semibold text-ink">{f.airline}</p>
                <p className="font-mono text-[11px] text-steel">
                  {f.flightNo} · {f.aircraft} · {f.cabin}
                </p>
              </div>
            </div>
            <span className="rounded bg-mint/15 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-mint">
              best match · {f.co2}
            </span>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <div>
              <span className="font-mono text-3xl font-bold text-ink">{f.departTime}</span>
              <span className="block font-mono text-xs text-steel">{f.fromCode}</span>
              <span className="block text-[11px] text-steel/70">{f.fromAirport}</span>
            </div>
            <div className="flex-1 px-2 text-center">
              <span className="block font-mono text-[11px] text-steel">{f.duration}</span>
              <span className="relative mx-auto my-1.5 block h-px w-full bg-edge">
                <span className="absolute -left-0.5 -top-[3px] size-[7px] rounded-full bg-mint" />
                <span className="absolute -right-0.5 -top-[3px] size-[7px] rounded-full bg-mint" />
              </span>
              <span className="block font-mono text-[11px] text-mint">direct</span>
            </div>
            <div className="text-right">
              <span className="font-mono text-3xl font-bold text-ink">{f.arriveTime}</span>
              <span className="block font-mono text-xs text-steel">{f.toCode}</span>
              <span className="block text-[11px] text-steel/70">{f.toAirport}</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-edge pt-5 font-mono text-xs sm:grid-cols-4">
            <div>
              <span className="block text-[10px] uppercase tracking-[0.15em] text-steel">
                carry-on
              </span>
              <span className="mt-1 block text-ink">{f.carryOn}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-[0.15em] text-steel">
                checked bag
              </span>
              <span className="mt-1 block text-ink">{f.checked}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-[0.15em] text-steel">
                cancellation
              </span>
              <span className="mt-1 block text-ink">{f.refundable}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-[0.15em] text-steel">
                changes
              </span>
              <span className="mt-1 block text-ink">{f.changes}</span>
            </div>
          </div>
        </div>

        {/* fare options */}
        <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.25em] text-steel">
          fare options
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {fares.map((opt, i) => (
            <button
              key={opt.name}
              onClick={() => setFare(i)}
              className={`relative rounded-xl border p-4 text-left transition-colors ${
                fare === i
                  ? "border-mint bg-mint/10"
                  : "border-edge bg-panel hover:border-steel/50"
              }`}
            >
              {opt.best && (
                <span className="absolute -top-2 left-3 rounded bg-mint px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-void">
                  recommended
                </span>
              )}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink">{opt.name}</span>
                <span
                  className={`size-3.5 rounded-full border-2 ${
                    fare === i ? "border-mint bg-mint" : "border-steel/50"
                  }`}
                />
              </div>
              <p className="mt-1 font-mono text-sm font-bold text-mint">
                {opt.price === 0 ? "included" : `+$${opt.price}`}
              </p>
              <ul className="mt-3 space-y-1.5 font-mono text-[11px] text-steel">
                {opt.perks.map((p) => (
                  <li key={p} className="flex items-center gap-2">
                    <span className="text-mint">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        {/* total + CTA */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-edge bg-panel p-5">
          <div>
            <span className="block font-mono text-[10px] uppercase tracking-[0.15em] text-steel">
              total · {fares[fare].name} fare
            </span>
            <span className="font-mono text-2xl font-bold text-mint">${total}</span>
            <span className="ml-2 font-mono text-xs text-steel">
              within ${trip.budget} budget · you save ${trip.budget - total}
            </span>
          </div>
          <Link
            to="/booking"
            className="chrome bevel rounded-lg px-10 py-3 font-mono text-sm font-bold uppercase tracking-[0.12em] text-void"
          >
            Select &amp; book
          </Link>
        </div>
      </section>
    </Shell>
  );
}
