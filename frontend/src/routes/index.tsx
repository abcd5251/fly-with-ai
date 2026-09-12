import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowLeftRight,
  BellRing,
  Check,
  ChevronRight,
  Mail,
  MailOpen,
  Minus,
  Plus,
  Lock,
  Radar,
  Settings2,
  Timer,
} from "lucide-react";
import { Shell } from "@/components/Shell";
import { useCatalog } from "@/hooks/use-catalog";
import { useCountdown } from "@/hooks/use-countdown";
import {
  fmtCountdown,
  holdQuote,
  holdWindows,
  isActive,
  placeHold,
  policyCheck,
  shortTx,
  type Hold,
} from "@/lib/hold";
import {
  agentRun,
  codeFor,
  defaultTrip,
  hbar,
  loadTrip,
  matchedFlight,
  money,
  nightsBetween,
  saveSelection,
  saveTrip,
  type Trip,
} from "@/lib/trip";
import { notifyMatch } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Set Your Trip — Autonomous Flight Agent on Hedera x402 | fly402" },
      {
        name: "description",
        content:
          "Step 1 of 2 — tell the agent your route, dates and budget. It pays for flight data with Hedera x402 and emails you the moment it finds a match.",
      },
      { property: "og:title", content: "Set Your Trip — fly402" },
      {
        property: "og:description",
        content:
          "Set the request once. The agent pays 0.01 HBAR per API call, finds the best deal, and emails you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RequestPage,
});

const cabins = ["Economy", "Premium", "Business"] as const;

function RequestPage() {
  const [trip, setTrip] = useState<Trip>(defaultTrip);
  const [monitoring, setMonitoring] = useState(false);
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [hold, setHold] = useState<Hold | null>(null);
  const holdPlaced = useRef(false);
  const emailSent = useRef(false);

  useEffect(() => setTrip(loadTrip()), []);

  const catalog = useCatalog(trip);
  const match = catalog.flights[0] ?? matchedFlight;
  const liveSource = catalog.live > 0;

  const quote = holdQuote(match.price * trip.passengers, trip.holdHours);
  const gate = policyCheck(quote, trip);

  const monitorLog = [
    `monitoring ${trip.fromCode} → ${trip.toCode} · polling every 5 min`,
    "POST /flights/search",
    "HTTP 402 · payment required",
    `paid ${agentRun.paid} HBAR · x402`,
    "hedera testnet tx confirmed",
    liveSource
      ? `google flights · ${catalog.flights.length} itineraries priced`
      : `${agentRun.optionsScanned} options analyzed · scored against budget`,
    `match found · ${match.airline} ${match.flightNo} ${money(match.price)}`,
    ...(trip.autoHold
      ? gate.ok
        ? [
            "POST /holds · HTTP 402 · payment required",
            `hold fee ${hbar(quote.fee)} paid · non-refundable`,
            `deposit ${hbar(quote.deposit)} escrowed · refundable`,
            `seat held · price locked for ${trip.holdHours}h`,
          ]
        : [`hold skipped · ${gate.reason}`]
      : []),
    `email sent to ${trip.email}`,
  ];

  // the "monitoring started" confirmation, then the log streams on the page itself
  useEffect(() => {
    if (!monitoring) return;
    const id = setTimeout(() => setStarted(true), 1500);
    return () => clearTimeout(id);
  }, [monitoring]);

  useEffect(() => {
    if (!started || step >= monitorLog.length) return;
    const id = setTimeout(() => setStep((s) => s + 1), step === 0 ? 300 : 620);
    return () => clearTimeout(id);
  }, [started, step, monitorLog.length]);

  const emailedNow = started && step >= monitorLog.length;

  useEffect(() => {
    if (!emailedNow || !gate.ok || holdPlaced.current) return;
    holdPlaced.current = true;
    saveSelection({ flightId: match.id, fareIndex: 1 });
    placeHold({
      trip,
      flightId: match.id,
      fareIndex: 1,
      priceLocked: match.price,
      hours: trip.holdHours,
    })
      .then(setHold)
      .catch(() => {
        holdPlaced.current = false;
      });
  }, [emailedNow, gate.ok, trip, match]);

  // Send email notification when match is found
  useEffect(() => {
    if (!emailedNow || emailSent.current) return;
    emailSent.current = true;

    // Build flight match data for the notification
    const flightData = {
      id: match.id,
      airline: match.airline,
      flightNo: match.flightNo,
      fromCode: match.fromCode,
      toCode: match.toCode,
      departTime: match.departTime,
      arriveTime: match.arriveTime,
      duration: match.duration,
      price: match.price,
      stops: match.stops,
    };

    // Build trip data for the notification
    const tripData = {
      from: trip.from,
      fromCode: trip.fromCode,
      to: trip.to,
      toCode: trip.toCode,
      depart: trip.depart,
      ret: trip.ret,
      budget: trip.budget,
      passengers: trip.passengers,
      cabin: trip.cabin,
      email: trip.email,
    };

    notifyMatch({ flight: flightData, trip: tripData })
      .then((res) => {
        if (res.success) {
          console.log("[monitor] Email notification sent:", res.messageId);
        } else {
          console.warn("[monitor] Email notification failed:", res.error);
        }
      })
      .catch((err) => {
        console.error("[monitor] Email notification error:", err);
        emailSent.current = false; // Allow retry
      });
  }, [emailedNow, match, trip]);

  const holdLeft = useCountdown(hold?.expiresAt ?? null);
  const holdLive = isActive(hold, Date.now()) && holdLeft > 0;

  const set = <K extends keyof Trip>(key: K, value: Trip[K]) =>
    setTrip((t) => ({ ...t, [key]: value }));
  const nights = nightsBetween(trip.depart, trip.ret);
  const emailed = started && step >= monitorLog.length;

  const swap = () =>
    setTrip((t) => ({
      ...t,
      from: t.to,
      fromCode: t.toCode,
      to: t.from,
      toCode: t.fromCode,
    }));

  return (
    <Shell step={1}>
      <section className="mx-auto max-w-[940px] py-14">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-mint">
            step 01 / 02 — travel request
          </p>
          <h1 className="mt-3 text-balance text-5xl font-semibold leading-[1.03] tracking-tight sm:text-6xl">
            {monitoring ? (
              <>
                The agent is
                <br />
                watching fares.
              </>
            ) : (
              <>
                Tell the agent
                <br />
                what you want.
              </>
            )}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-steel">
            {monitoring ? (
              <>
                You can close this tab. The agent keeps polling fares, pays for each data call with
                Hedera x402, and emails <span className="text-ink">{trip.email}</span> as soon as
                something matches your budget.
              </>
            ) : (
              <>
                Set your route, dates and budget once. The agent monitors fares around the clock,
                pays for each flight-data call with Hedera x402, and emails you the moment something
                matches.
              </>
            )}
          </p>

          {monitoring ? (
            <div className="mt-8 space-y-3">
              {/* live monitoring panel */}
              <div className="rounded-2xl border border-edge bg-panel p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-mint">
                    <Radar className="size-4 animate-[pulse_1.8s_ease-in-out_infinite]" />
                    {emailed ? "match found" : "monitoring active"}
                  </p>
                  <button
                    onClick={() => {
                      setMonitoring(false);
                      setStarted(false);
                      setStep(0);
                    }}
                    className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-steel transition-colors hover:text-mint"
                  >
                    <Settings2 className="size-3.5" />
                    Change request
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {[
                    { k: "Route", v: `${trip.fromCode} → ${trip.toCode}` },
                    { k: "Dates", v: `${nights ?? "—"} nights` },
                    holdLive
                      ? { k: "Hold fee · paid", v: hbar(hold!.fee) }
                      : { k: "Budget", v: `${money(trip.budget)}` },
                    holdLive
                      ? { k: "Deposit · escrowed", v: hbar(hold!.deposit) }
                      : { k: "Data paid", v: step >= 4 ? `${agentRun.paid} HBAR` : "—" },
                  ].map((s) => (
                    <div key={s.k} className="chip rounded-xl p-3">
                      <span className="block font-mono text-[9.5px] uppercase tracking-[0.14em] text-steel">
                        {s.k}
                      </span>
                      <span className="mt-0.5 block font-mono text-[13px] font-bold text-ink">
                        {s.v}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 rounded-xl border border-edge bg-log p-4 font-mono text-[12.5px] leading-relaxed">
                  {monitorLog.slice(0, step).map((l, i) => (
                    <div key={l} className="logline flex items-center gap-2.5">
                      <Check className="size-3.5 shrink-0 text-mint" />
                      <span className={i === monitorLog.length - 1 ? "text-mint" : "text-steel"}>
                        {l}
                      </span>
                    </div>
                  ))}
                  {step < monitorLog.length && (
                    <div className="flex items-center gap-2.5 text-ink">
                      <span className="size-1.5 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-amber" />
                      watching<span className="text-mint">…</span>
                    </div>
                  )}
                </div>

                {holdLive && (
                  <div className="logline mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-mint/35 bg-mint/[0.06] px-4 py-3">
                    <p className="inline-flex items-center gap-2 font-mono text-[12px] text-mint">
                      <Lock className="size-3.5" />
                      seat held · {match.airline} {match.flightNo} · price locked at{" "}
                      {money(match.price)}
                    </p>
                    <p className="inline-flex items-center gap-2 font-mono text-[12px] text-ink">
                      <Timer className="size-3.5 text-mint" />
                      {fmtCountdown(holdLeft)} left
                    </p>
                  </div>
                )}
              </div>

              {/* the email the agent sent — clicking it opens the matched flight */}
              {emailed && (
                <div className="logline">
                  <p className="mt-6 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-steel">
                    <Mail className="size-3.5" />
                    your inbox
                    <span className="rounded bg-mint px-1.5 py-0.5 text-[9px] font-bold tracking-[0.12em] text-void">
                      1 new
                    </span>
                  </p>
                  <Link
                    to="/flight"
                    className="group mt-3 block rounded-2xl border border-mint/40 bg-[#0c1613] p-5 transition-all hover:border-mint/70 hover:shadow-[0_0_50px_-18px_rgba(70,240,192,0.8)]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="chrome bevel grid size-9 shrink-0 place-items-center rounded-lg font-mono text-[10px] font-bold text-void">
                        402
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-[12px] text-ink">
                          agent@fly402.ai
                        </p>
                        <p className="truncate font-mono text-[11px] text-steel">to {trip.email}</p>
                      </div>
                      <span className="font-mono text-[11px] text-steel">just now</span>
                    </div>
                    <p className="mt-3.5 text-[15px] font-semibold text-ink">
                      {holdLive ? "🔒 Seat held — " : "✈️ Match found — "}
                      {match.airline} {match.flightNo} for {money(match.price)}
                      {holdLive && (
                        <span className="text-mint"> · {fmtCountdown(holdLeft)} left</span>
                      )}
                    </p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-steel">
                      {trip.from} → {trip.to} · direct · {match.duration}.{" "}
                      {holdLive ? (
                        <>
                          I paid {hbar(hold!.fee)} to take this seat off the market and escrowed{" "}
                          {hbar(hold!.deposit)} as a refundable deposit — your price is locked
                          until the timer runs out. Open it to book, or release the hold and the
                          deposit comes straight back.
                        </>
                      ) : (
                        <>
                          I paid {agentRun.paid} HBAR to unlock live fares and found 4 options under
                          your {money(trip.budget)} budget. Open to see the full flight and book it.
                        </>
                      )}
                    </p>
                    <p className="mt-2.5 font-mono text-[10.5px] text-steel">
                      {liveSource
                        ? `live fare · google flights via serpapi${
                            catalog.fetchedAt
                              ? ` · ${new Date(catalog.fetchedAt).toLocaleString()}`
                              : ""
                          }`
                        : "cached fares · live feed unavailable"}
                    </p>
                    {holdLive && (
                      <p className="mt-1 font-mono text-[10.5px] text-steel">
                        escrow {shortTx(hold!.escrow)} · deposit tx {shortTx(hold!.depositTx)}
                        {hold!.mode === "simulated" && " · local"}
                      </p>
                    )}
                    <span className="mt-4 inline-flex items-center gap-2 rounded-lg bg-mint px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-void">
                      <MailOpen className="size-3.5" />
                      Open the matched flight
                      <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                  <p className="mt-2.5 font-mono text-[10px] text-steel">
                    the same email lands in {trip.email} — its link opens step 02 on any device
                  </p>
                </div>
              )}
            </div>
          ) : (
            <form
              className="mt-9 space-y-3.5 rounded-3xl border border-edge bg-panel/40 p-6 sm:p-8"
              onSubmit={(e) => {
                e.preventDefault();
                saveTrip(trip);
                setStep(0);
                setStarted(false);
                setMonitoring(true);
              }}
            >
              {/* route */}
              <div className="relative grid gap-3.5 sm:grid-cols-2">
                <label className="chip block rounded-xl px-5 py-4">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-steel">
                    From
                  </span>
                  <input
                    value={trip.from}
                    onChange={(e) => {
                      const from = e.target.value;
                      setTrip((t) => ({ ...t, from, fromCode: codeFor(from, t.fromCode) }));
                    }}
                    className="mt-1.5 w-full bg-transparent text-xl font-medium text-ink outline-none placeholder:text-steel/50"
                    placeholder="Taipei"
                  />
                  <span className="font-mono text-[11px] text-mint">{trip.fromCode}</span>
                </label>

                <button
                  type="button"
                  onClick={swap}
                  aria-label="Swap origin and destination"
                  className="chip absolute left-1/2 top-1/2 z-10 hidden size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-steel transition-colors hover:text-mint sm:grid"
                >
                  <ArrowLeftRight className="size-4" />
                </button>

                <label className="chip block rounded-xl px-5 py-4">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-steel">
                    To
                  </span>
                  <input
                    value={trip.to}
                    onChange={(e) => {
                      const to = e.target.value;
                      setTrip((t) => ({ ...t, to, toCode: codeFor(to, t.toCode) }));
                    }}
                    className="mt-1.5 w-full bg-transparent text-xl font-medium text-ink outline-none placeholder:text-steel/50"
                    placeholder="Tokyo"
                  />
                  <span className="font-mono text-[11px] text-mint">{trip.toCode}</span>
                </label>
              </div>

              {/* dates */}
              <div className="grid gap-3.5 sm:grid-cols-2">
                <label className="chip block rounded-xl px-5 py-4">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-steel">
                    Depart
                  </span>
                  <input
                    type="date"
                    value={trip.depart}
                    onChange={(e) => set("depart", e.target.value)}
                    className="mt-1.5 w-full bg-transparent font-mono text-base font-medium text-ink outline-none [color-scheme:dark]"
                  />
                </label>
                <label className="chip block rounded-xl px-5 py-4">
                  <span className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-steel">
                    Return
                    {nights && <span className="text-mint">{nights} nights</span>}
                  </span>
                  <input
                    type="date"
                    value={trip.ret}
                    min={trip.depart}
                    onChange={(e) => set("ret", e.target.value)}
                    className="mt-1.5 w-full bg-transparent font-mono text-base font-medium text-ink outline-none [color-scheme:dark]"
                  />
                </label>
              </div>

              {/* passengers + cabin */}
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div className="chip flex items-center justify-between rounded-xl px-5 py-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-steel">
                    Passengers
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="Remove passenger"
                      onClick={() => set("passengers", Math.max(1, trip.passengers - 1))}
                      className="grid size-7 place-items-center rounded-md border border-edge text-steel transition-colors hover:border-mint/60 hover:text-mint"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-4 text-center font-mono text-base font-bold text-ink">
                      {trip.passengers}
                    </span>
                    <button
                      type="button"
                      aria-label="Add passenger"
                      onClick={() => set("passengers", Math.min(6, trip.passengers + 1))}
                      className="grid size-7 place-items-center rounded-md border border-edge text-steel transition-colors hover:border-mint/60 hover:text-mint"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </div>

                <div className="chip rounded-xl px-5 py-4">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-steel">
                    Cabin
                  </span>
                  <div className="mt-2 flex gap-1.5">
                    {cabins.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => set("cabin", c)}
                        className={`flex-1 rounded-md py-1.5 font-mono text-[11px] transition-colors ${
                          trip.cabin === c
                            ? "bg-mint/15 font-bold text-mint ring-1 ring-mint/40"
                            : "text-steel hover:text-ink"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* budget */}
              <div className="chip rounded-xl px-5 py-5">
                <div className="flex items-end justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-steel">
                    Max budget · per person
                  </span>
                  <span className="flex items-baseline font-mono text-2xl font-bold text-mint">
                    $
                    <input
                      type="number"
                      min={100}
                      max={3000}
                      step={10}
                      value={trip.budget}
                      onChange={(e) => set("budget", Math.min(3000, Number(e.target.value) || 0))}
                      onBlur={() =>
                        set("budget", Math.min(3000, Math.max(100, trip.budget || 100)))
                      }
                      className="nospin w-[4.5rem] bg-transparent text-right font-mono text-2xl font-bold text-mint outline-none"
                    />
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={1500}
                  step={10}
                  value={Math.min(1500, trip.budget)}
                  onChange={(e) => set("budget", Number(e.target.value))}
                  aria-label="Max budget"
                  className="range mt-3 w-full"
                  style={
                    {
                      "--fill": `${Math.min(100, Math.max(0, ((trip.budget - 100) / 1400) * 100))}%`,
                    } as CSSProperties
                  }
                />
                <div className="mt-1 flex justify-between font-mono text-[10px] text-steel/70">
                  <span>$100</span>
                  <span>$1,500</span>
                </div>
              </div>

              {/* prefs */}
              <div className="grid gap-3.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => set("directOnly", !trip.directOnly)}
                  className="chip flex items-center justify-between rounded-xl px-5 py-4 text-left"
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-steel">
                    Direct flights only
                  </span>
                  <span
                    className={`relative h-5 w-9 rounded-full transition-colors ${
                      trip.directOnly ? "bg-mint/80" : "bg-edge"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 size-4 rounded-full bg-void transition-all ${
                        trip.directOnly ? "left-[1.15rem]" : "left-0.5"
                      }`}
                    />
                  </span>
                </button>
                <label className="chip flex items-center gap-3 rounded-xl px-5 py-4">
                  <Mail className="size-4 shrink-0 text-steel" />
                  <span className="sr-only">Notify email</span>
                  <input
                    type="email"
                    value={trip.email}
                    onChange={(e) => set("email", e.target.value)}
                    className="w-full bg-transparent font-mono text-[13px] text-ink outline-none placeholder:text-steel/50"
                    placeholder="you@example.com"
                  />
                </label>
              </div>

              {/* auto-hold — the agent's authority to buy an option on the seat */}
              <div className="chip rounded-xl px-5 py-4">
                <button
                  type="button"
                  onClick={() => set("autoHold", !trip.autoHold)}
                  className="flex w-full items-center justify-between gap-4 text-left"
                >
                  <span>
                    <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-steel">
                      <Lock className="size-3.5" />
                      Auto-hold the seat
                    </span>
                    <span className="mt-1 block text-[13px] leading-relaxed text-steel">
                      Let the agent pay a small fee to take the seat off the market and lock the
                      price while you decide.
                    </span>
                  </span>
                  <span
                    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                      trip.autoHold ? "bg-mint/80" : "bg-edge"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 size-4 rounded-full bg-void transition-all ${
                        trip.autoHold ? "left-[1.15rem]" : "left-0.5"
                      }`}
                    />
                  </span>
                </button>

                {trip.autoHold && (
                  <div className="mt-4 space-y-3 border-t border-edge pt-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="rounded-lg bg-white/[0.04] px-3.5 py-3">
                        <span className="block font-mono text-[9.5px] uppercase tracking-[0.15em] text-steel">
                          Max hold fee
                        </span>
                        <span className="mt-1 flex items-baseline gap-1 font-mono text-lg font-bold text-ink">
                          <input
                            type="number"
                            min={0}
                            max={5}
                            step={0.1}
                            value={trip.maxHoldFee}
                            onChange={(e) =>
                              set("maxHoldFee", Math.min(5, Math.max(0, Number(e.target.value))))
                            }
                            className="nospin w-full bg-transparent font-mono text-lg font-bold text-ink outline-none"
                          />
                          <span className="text-[11px] text-steel">HBAR</span>
                        </span>
                        <span className="font-mono text-[10px] text-steel">non-refundable</span>
                      </label>

                      <label className="rounded-lg bg-white/[0.04] px-3.5 py-3">
                        <span className="block font-mono text-[9.5px] uppercase tracking-[0.15em] text-steel">
                          Max deposit
                        </span>
                        <span className="mt-1 flex items-baseline gap-1 font-mono text-lg font-bold text-ink">
                          <input
                            type="number"
                            min={0}
                            max={20}
                            step={0.1}
                            value={trip.maxDeposit}
                            onChange={(e) =>
                              set("maxDeposit", Math.min(20, Math.max(0, Number(e.target.value))))
                            }
                            className="nospin w-full bg-transparent font-mono text-lg font-bold text-ink outline-none"
                          />
                          <span className="text-[11px] text-steel">HBAR</span>
                        </span>
                        <span className="font-mono text-[10px] text-steel">
                          escrowed, refundable
                        </span>
                      </label>

                      <div className="rounded-lg bg-white/[0.04] px-3.5 py-3">
                        <span className="block font-mono text-[9.5px] uppercase tracking-[0.15em] text-steel">
                          Hold window
                        </span>
                        <div className="mt-1.5 flex gap-1.5">
                          {holdWindows.map((h) => (
                            <button
                              key={h}
                              type="button"
                              onClick={() => set("holdHours", h)}
                              className={`flex-1 rounded-md py-1.5 font-mono text-[11px] transition-colors ${
                                trip.holdHours === h
                                  ? "bg-mint/15 font-bold text-mint ring-1 ring-mint/40"
                                  : "text-steel hover:text-ink"
                              }`}
                            >
                              {h}h
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <p className="font-mono text-[11px] leading-relaxed text-steel">
                      For this trip the agent would pay{" "}
                      <span className="text-mint">{hbar(quote.fee)}</span> to hold the seat and
                      escrow <span className="text-mint">{hbar(quote.deposit)}</span> — the deposit
                      is credited to your ticket, or refunded in full if you let the hold go. Above
                      these caps the agent asks you first.
                    </p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="chrome bevel mt-1 flex w-full items-center justify-center gap-2 rounded-xl py-5 font-mono text-sm font-bold uppercase tracking-[0.14em] text-void transition-transform active:scale-[0.99]"
              >
                <BellRing className="size-4" />
                Start monitoring
              </button>
              <p className="text-center font-mono text-[11px] text-steel">
                No card needed — the agent funds its own data calls with HBAR.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* confirmation that monitoring is now running */}
      {monitoring && !started && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-void/85 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-mint/30 bg-panel p-6 text-center shadow-[0_0_60px_-12px_rgba(70,240,192,0.35)]">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-mint/15 text-mint ring-1 ring-mint/30">
              <Radar className="size-6 animate-[pulse_1.4s_ease-in-out_infinite]" />
            </span>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.25em] text-mint">
              monitoring started
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">
              Watching {trip.fromCode} → {trip.toCode}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-steel">
              The agent takes it from here. We&apos;ll email{" "}
              <span className="text-ink">{trip.email}</span> when a fare fits your{" "}
              {money(trip.budget)} budget.
            </p>
          </div>
        </div>
      )}
    </Shell>
  );
}
