import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Armchair,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Coins,
  Leaf,
  Lock,
  LockOpen,
  Luggage,
  MonitorPlay,
  Plane,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Radio,
  Timer,
  TrendingDown,
  TriangleAlert,
  Users,
  UtensilsCrossed,
  Wallet,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { Shell } from "@/components/Shell";
import { pickFlight, useCatalog } from "@/hooks/use-catalog";
import { useCountdown } from "@/hooks/use-countdown";
import {
  coversFlight,
  expireHold,
  fmtCountdown,
  holdQuote,
  isActive,
  loadHold,
  placeHold,
  policyCheck,
  releaseHold,
  shortTx,
  type Hold,
} from "@/lib/hold";
import {
  agentRun,
  defaultTrip,
  fmtDate,
  flightById,
  flights,
  loadSelection,
  storedSelection,
  matchedFlight,
  loadTrip,
  money,
  returnLegFor,
  saveSelection,
  type Amenity,
  type Fare,
  type Flight,
  type Trip,
} from "@/lib/trip";

export const Route = createFileRoute("/flight")({
  head: () => ({
    meta: [
      { title: "Match Found — Flight Details & Fare Options | TravelPay AI" },
      {
        name: "description",
        content:
          "Step 2 of 2 — the agent emailed you a match. See the full schedule, aircraft, baggage, CO₂ and fare options it unlocked with Hedera x402.",
      },
      { property: "og:title", content: "Match Found — Flight Details & Fare Options" },
      {
        property: "og:description",
        content: "Everything the agent unlocked about your matched flight. One signature books it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MatchPage,
});

const amenityMeta: Record<Amenity, { icon: typeof Wifi; label: string }> = {
  power: { icon: Zap, label: "Power outlet" },
  wifi: { icon: Wifi, label: "Wi-Fi on board" },
  screen: { icon: MonitorPlay, label: "Seat-back screen" },
  meal: { icon: UtensilsCrossed, label: "Meal included" },
};

function Amenities({ list, className = "" }: { list: Amenity[]; className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {list.map((a) => {
        const { icon: Icon, label } = amenityMeta[a];
        return (
          <span key={a} title={label} className="text-mint/70">
            <Icon className="size-3.5" />
          </span>
        );
      })}
    </div>
  );
}

function AirlineMark({ code, className = "" }: { code: string; className?: string }) {
  return (
    <span
      className={`chrome bevel grid size-10 shrink-0 place-items-center rounded-lg font-mono text-sm font-bold text-void ${className}`}
    >
      {code}
    </span>
  );
}

/** A search-result row: airline · times · duration · price · select. */
function OptionRow({
  f,
  selected,
  onSelect,
  budget,
}: {
  f: Flight;
  selected: boolean;
  onSelect: () => void;
  budget: number;
}) {
  return (
    <button
      onClick={onSelect}
      className={`block w-full rounded-2xl border p-4 text-left transition-all sm:p-5 ${
        selected
          ? "border-mint/70 bg-mint/[0.06] shadow-[0_0_40px_-16px_rgba(70,240,192,0.6)]"
          : "border-edge bg-panel hover:border-steel/45 hover:bg-panel/80"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {f.live && (
          <span className="inline-flex items-center gap-1.5 rounded bg-mint/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-mint">
            <Radio className="size-3" />
            live fare
          </span>
        )}
        {f.tag && (
          <span className="rounded bg-mint/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-mint">
            {f.tag}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 rounded bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-steel">
          <Leaf className="size-3 text-mint/80" />
          {f.co2 >= 0 ? "−" : "+"}
          {Math.abs(f.co2)}% CO₂e{f.co2kg ? ` · ${f.co2kg} kg` : ` · ${f.trees} trees/day`}
        </span>
        {f.seatsLeft <= 4 && (
          <span className="rounded bg-amber/15 px-2 py-0.5 font-mono text-[10px] font-bold text-amber">
            {f.seatsLeft} seats left
          </span>
        )}
      </div>

      <div className="mt-3.5 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-[9.5rem] items-center gap-3">
          <AirlineMark code={f.code} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{f.airline}</p>
            <p className="font-mono text-[11px] text-steel">{f.flightNo}</p>
          </div>
        </div>

        <div className="flex flex-1 items-center gap-3">
          <div>
            <p className="font-mono text-2xl font-bold leading-none text-ink">{f.departTime}</p>
            <p className="mt-1.5 font-mono text-[11px] text-steel">
              {f.fromCode} {f.fromTerminal}
            </p>
          </div>
          <div className="flex-1 px-1 text-center">
            <p className="font-mono text-[11px] text-steel">{f.duration}</p>
            <span className="relative my-1.5 block h-px w-full bg-edge">
              <span className="absolute -left-px -top-[3px] size-[7px] rounded-full bg-steel/70" />
              <Plane className="absolute -top-[7px] left-1/2 size-3.5 -translate-x-1/2 rotate-90 text-mint" />
              <span className="absolute -right-px -top-[3px] size-[7px] rounded-full bg-steel/70" />
            </span>
            <p className="font-mono text-[11px] text-mint">
              {f.stops === 0 ? "Direct" : `${f.stops} stop`}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-bold leading-none text-ink">
              {f.arriveTime}
              {f.nextDay && <sup className="ml-0.5 font-mono text-xs text-amber">+1</sup>}
            </p>
            <p className="mt-1.5 font-mono text-[11px] text-steel">
              {f.toCode} {f.toTerminal}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-edge pt-3 sm:min-w-[10.5rem] sm:justify-end sm:border-0 sm:pt-0">
          <div className="text-right">
            <p className="font-mono text-xl font-bold text-mint">{money(f.price)}</p>
            <p className="font-mono text-[10px] text-steel">
              {f.price <= budget ? `${money(budget - f.price)} under budget` : "over budget"}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] transition-colors ${
              selected ? "bg-mint text-void" : "border border-edge text-steel"
            }`}
          >
            {selected ? (
              <>
                <Check className="size-3.5" />
                Selected
              </>
            ) : (
              <>
                Select
                <ChevronRight className="size-3.5" />
              </>
            )}
          </span>
        </div>
      </div>
    </button>
  );
}

/** One leg of the itinerary, drawn as a vertical timeline like an airline detail sheet. */
function LegTimeline({
  label,
  date,
  duration,
  departTime,
  arriveTime,
  nextDay,
  origin,
  destination,
  airline,
  flightNo,
  aircraft,
  cabin,
  amenities,
}: {
  label: string;
  date: string;
  duration: string;
  departTime: string;
  arriveTime: string;
  nextDay?: boolean;
  origin: { code: string; city: string; airport: string; terminal: string };
  destination: { code: string; city: string; airport: string; terminal: string };
  airline: string;
  flightNo: string;
  aircraft: string;
  cabin: string;
  amenities: Amenity[];
}) {
  return (
    <div className="rounded-2xl border border-edge bg-panel p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded bg-ink px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-void">
          {label}
        </span>
        <span className="font-mono text-[12px] text-steel">{date}</span>
        <span className="text-edge">|</span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-steel">
          <Clock className="size-3.5" />
          {duration}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-[3.5rem_1.25rem_1fr] gap-x-3">
        {/* depart */}
        <span className="font-mono text-lg font-bold leading-tight text-ink">{departTime}</span>
        <span className="relative flex justify-center">
          <span className="absolute top-1.5 size-2 rounded-full ring-2 ring-mint" />
          <span className="mt-1.5 h-full w-px bg-edge" />
        </span>
        <div className="pb-5">
          <p className="text-sm font-semibold text-ink">
            {origin.code} · {origin.city} {origin.airport}
          </p>
          {origin.terminal && (
            <p className="font-mono text-[11px] text-steel">
              Terminal {origin.terminal.replace("T", "")}
            </p>
          )}
        </div>

        {/* segment */}
        <span />
        <span className="relative flex justify-center">
          <span className="h-full w-px bg-edge" />
        </span>
        <div className="mb-5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-lg bg-white/[0.04] px-3 py-2">
          <span className="font-mono text-[12px] font-medium text-ink">{airline}</span>
          <span className="font-mono text-[12px] text-steel">{flightNo}</span>
          <span className="font-mono text-[12px] text-steel">{aircraft}</span>
          <span className="font-mono text-[12px] text-steel">{cabin}</span>
          <Amenities list={amenities} className="ml-auto" />
        </div>

        {/* arrive */}
        <span className="font-mono text-lg font-bold leading-tight text-ink">
          {arriveTime}
          {nextDay && <sup className="ml-0.5 text-[10px] text-amber">+1</sup>}
        </span>
        <span className="relative flex justify-center">
          <span className="absolute top-1.5 size-2 rounded-full bg-mint" />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">
            {destination.code} · {destination.city} {destination.airport}
          </p>
          {destination.terminal && (
            <p className="font-mono text-[11px] text-steel">
              Terminal {destination.terminal.replace("T", "")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function FareCard({
  fare,
  selected,
  onSelect,
  price,
}: {
  fare: Fare;
  selected: boolean;
  onSelect: () => void;
  price: number;
}) {
  return (
    <button
      onClick={onSelect}
      className={`relative flex h-full flex-col rounded-2xl border p-5 text-left transition-all ${
        selected
          ? "border-mint/70 bg-mint/[0.06] shadow-[0_0_40px_-18px_rgba(70,240,192,0.7)]"
          : "border-edge bg-panel hover:border-steel/45"
      }`}
    >
      {fare.recommended && (
        <span className="absolute -top-2.5 left-4 rounded bg-mint px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-void">
          recommended
        </span>
      )}

      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-semibold text-ink">{fare.name}</p>
          <p className="font-mono text-[11px] text-steel">{fare.note}</p>
        </div>
        <span
          className={`mt-1 grid size-4 shrink-0 place-items-center rounded-full border-2 ${
            selected ? "border-mint bg-mint" : "border-steel/50"
          }`}
        >
          {selected && <Check className="size-2.5 text-void" strokeWidth={4} />}
        </span>
      </div>

      <p className="mt-3 font-mono text-2xl font-bold text-mint">{money(price)}</p>
      <p className="font-mono text-[11px] text-steel">
        {fare.delta === 0 ? "base fare" : `+${money(fare.delta)} vs Basic`}
      </p>

      <div className="mt-4 space-y-3 border-t border-edge pt-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-steel">Baggage</p>
          <p className="mt-1.5 flex items-center gap-2 text-[13px] text-ink">
            <Luggage className="size-3.5 text-mint/80" />
            Carry-on {fare.carryOn}
          </p>
          <p className="mt-1 flex items-center gap-2 text-[13px] text-ink">
            {fare.checked ? (
              <>
                <Luggage className="size-3.5 text-mint/80" />
                Checked {fare.checked}
              </>
            ) : (
              <>
                <X className="size-3.5 text-danger" />
                <span className="text-steel">No checked bag</span>
              </>
            )}
          </p>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-steel">
            Flexibility
          </p>
          <p className="mt-1.5 flex items-center gap-2 text-[13px] text-ink">
            {fare.refundable ? (
              <ShieldCheck className="size-3.5 text-mint/80" />
            ) : (
              <X className="size-3.5 text-danger" />
            )}
            <span className={fare.refundable ? "" : "text-steel"}>{fare.refund}</span>
          </p>
          <p className="mt-1 flex items-center gap-2 text-[13px] text-ink">
            <RefreshCcw className="size-3.5 text-mint/80" />
            {fare.change}
          </p>
        </div>

        {fare.bundle && (
          <div className="rounded-lg border border-mint/25 bg-mint/[0.07] p-3">
            <p className="flex items-center justify-between font-mono text-[11px] font-bold text-mint">
              {fare.bundle.name}
              <span className="text-[10px] font-normal text-steel">
                worth {money(fare.bundle.value)}+
              </span>
            </p>
            <ul className="mt-2 space-y-1">
              {fare.bundle.items.map((it) => (
                <li key={it} className="flex items-center gap-2 font-mono text-[11px] text-ink">
                  <Check className="size-3 text-mint" />
                  {it}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-steel">
            Other perks
          </p>
          <ul className="mt-1.5 space-y-1">
            {fare.perks.map((p) => (
              <li key={p} className="flex items-center gap-2 text-[13px] text-ink">
                <Sparkles className="size-3.5 text-mint/80" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </button>
  );
}

function MatchPage() {
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip>(defaultTrip);
  const [flightId, setFlightId] = useState(matchedFlight.id);
  const [fareIndex, setFareIndex] = useState(1);
  const [hold, setHold] = useState<Hold | null>(null);
  const [holdBusy, setHoldBusy] = useState(false);
  const [confirmRelease, setConfirmRelease] = useState(false);

  const pinned = useRef(false);

  useEffect(() => {
    setTrip(loadTrip());
    const sel = storedSelection();
    if (sel) {
      setFlightId(sel.flightId);
      setFareIndex(sel.fareIndex);
      pinned.current = true;
    }
    setHold(loadHold());
  }, []);

  const catalog = useCatalog(trip);
  const f = pickFlight(catalog, flightId);
  const back = f.live ? null : (catalog.returnLegs[f.id] ?? returnLegFor(f.id));
  // follow the agent's match until the traveller picks something themselves
  useEffect(() => {
    // wait for the live list — resetting against the offline fallback would
    // throw away the agent's match before it ever loads
    if (catalog.loading) return;
    const top = catalog.flights[0];
    if (!top) return;
    if (!pinned.current || !catalog.flights.some((x) => x.id === flightId)) {
      setFlightId(top.id);
      setFareIndex(1);
    }
  }, [catalog.flights, catalog.loading, flightId]);

  const fare = f.fares[fareIndex] ?? f.fares[0]!;
  const perPerson = f.price + fare.delta;
  const total = perPerson * trip.passengers;
  const withinBudget = perPerson <= trip.budget;

  // hold state — the option the agent bought on a specific seat
  const holdLeft = useCountdown(hold && hold.status === "held" ? hold.expiresAt : null);
  const holdLive = !!hold && hold.status === "held" && holdLeft > 0;
  const holdApplies = holdLive && coversFlight(hold, f.id);
  const holdFlight = hold ? pickFlight(catalog, hold.flightId) : null;
  const holdWindowPct = hold
    ? Math.max(0, Math.min(100, (holdLeft / (hold.expiresAt - hold.createdAt)) * 100))
    : 0;
  const expiringSoon = holdLive && holdLeft < 2 * 3_600_000;

  const credit = holdApplies ? hold!.deposit : 0;
  const balanceDue = Math.max(0, total - credit);

  const quote = holdQuote(f.price * trip.passengers, trip.holdHours);
  const gate = policyCheck(quote, trip);

  // a hold that runs out while the page is open refunds itself
  useEffect(() => {
    if (hold && hold.status === "held" && holdLeft === 0 && hold.expiresAt <= Date.now()) {
      setHold(expireHold(hold));
    }
  }, [hold, holdLeft]);

  const takeHold = async (targetId: string) => {
    setHoldBusy(true);
    try {
      if (hold && hold.status === "held") await releaseHold(hold);
      const next = await placeHold({
        trip,
        flightId: targetId,
        fareIndex,
        priceLocked: flightById(targetId).price,
        hours: trip.holdHours,
      });
      setHold(next);
    } finally {
      setHoldBusy(false);
      setConfirmRelease(false);
    }
  };

  const dropHold = async () => {
    if (!hold) return;
    setHoldBusy(true);
    try {
      setHold(await releaseHold(hold));
    } finally {
      setHoldBusy(false);
      setConfirmRelease(false);
    }
  };

  const facts = [
    { icon: Plane, k: "Aircraft", v: f.aircraft },
    { icon: Armchair, k: "Seat pitch", v: f.legroom },
    {
      icon: Clock,
      k: "On-time",
      v: f.oftenDelayed ? "often delayed" : `${f.onTime}%`,
    },
    { icon: Leaf, k: "CO₂e", v: `${f.co2 >= 0 ? "−" : "+"}${Math.abs(f.co2)}% vs avg` },
    {
      icon: Users,
      k: "Seats left",
      v: f.live ? "live inventory" : `${f.seatsLeft} at this fare`,
    },
    {
      icon: TrendingDown,
      k: "Price level",
      v: f.live && catalog.insights?.level ? catalog.insights.level : "Lowest in 21 days",
    },
  ];

  const book = () => {
    saveSelection({ flightId: f.id, fareIndex });
    navigate({ to: "/booking" });
  };

  return (
    <Shell step={2}>
      {/* trip header — you land here from the link in the agent's email */}
      <section className="relative mt-8 overflow-hidden rounded-2xl border border-edge bg-panel p-6 sm:p-7">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(70% 130% at 85% 0%, rgba(70,240,192,.12), transparent 70%)",
          }}
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-mint">
              step 02 / 02 — matched flight
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-none tracking-tight sm:text-4xl">
              {trip.from} <span className="text-mint">→</span> {trip.to}
            </h1>
            <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[12.5px] text-steel">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5 text-mint/70" />
                {fmtDate(trip.depart)} → {fmtDate(trip.ret)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-3.5 text-mint/70" />
                {trip.passengers} {trip.passengers > 1 ? "travellers" : "traveller"} · {trip.cabin}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Wallet className="size-3.5 text-mint/70" />
                budget {money(trip.budget)} / person
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-steel transition-colors hover:text-mint"
              >
                <ArrowLeft className="size-3.5" />
                Edit request
              </Link>
              <Link
                to="/activity"
                className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-mint transition-opacity hover:opacity-75"
              >
                View full agent log
                <ChevronRight className="size-3.5" />
              </Link>
              <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] text-steel">
                <Radio className={`size-3.5 ${catalog.live ? "text-mint" : "text-steel"}`} />
                {catalog.live
                  ? `${catalog.live} of ${catalog.flights.length} rows live · google flights`
                  : "demo inventory · seller offline"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:w-[430px]">
            {[
              { icon: Coins, k: "Data paid", v: `${agentRun.paid} HBAR` },
              { icon: Zap, k: "402 calls", v: `${agentRun.calls}` },
              { icon: Sparkles, k: "Options", v: `${agentRun.optionsScanned}` },
              { icon: ShieldCheck, k: "Network", v: "Hedera" },
            ].map((s) => (
              <div key={s.k} className="chip rounded-xl p-3">
                <s.icon className="size-3.5 text-mint/80" />
                <span className="mt-2 block font-mono text-[9px] uppercase tracking-[0.14em] text-steel">
                  {s.k}
                </span>
                <span className="mt-0.5 block font-mono text-[13px] font-bold text-ink">{s.v}</span>
              </div>
            ))}
            <p className="col-span-2 font-mono text-[10px] text-steel sm:col-span-4">
              tx {agentRun.txId}
            </p>
          </div>
        </div>
      </section>

      {/* the seat hold — an option the agent bought with x402 */}
      {holdApplies ? (
        <section
          className={`mt-4 overflow-hidden rounded-2xl border p-5 sm:p-6 ${
            expiringSoon ? "border-amber/50 bg-amber/[0.06]" : "border-mint/45 bg-mint/[0.06]"
          }`}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p
                className={`inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] ${
                  expiringSoon ? "text-amber" : "text-mint"
                }`}
              >
                <Lock className="size-3.5" />
                seat held for you
              </p>
              <h2 className="mt-2 flex flex-wrap items-baseline gap-x-3 text-2xl font-semibold tracking-tight">
                <span className="inline-flex items-center gap-2">
                  <Timer className={`size-5 ${expiringSoon ? "text-amber" : "text-mint"}`} />
                  <span className="font-mono tabular-nums">{fmtCountdown(holdLeft)}</span>
                </span>
                <span className="text-[13px] font-normal text-steel">
                  left · price locked at {money(hold!.priceLocked)} / person
                </span>
              </h2>
              <div className="mt-3 h-1 w-full max-w-xs overflow-hidden rounded-full bg-edge">
                <div
                  className={`h-full rounded-full transition-[width] duration-1000 ${
                    expiringSoon ? "bg-amber" : "bg-mint"
                  }`}
                  style={{ width: `${holdWindowPct}%` }}
                />
              </div>
              <p className="mt-3 font-mono text-[10.5px] text-steel">
                escrow {shortTx(hold!.escrow)} · deposit tx {shortTx(hold!.depositTx)}
                {hold!.mode === "simulated" && " · local"}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="grid grid-cols-2 gap-2.5 sm:w-[300px]">
                <div className="chip rounded-xl p-3">
                  <span className="block font-mono text-[9px] uppercase tracking-[0.14em] text-steel">
                    Hold fee · paid
                  </span>
                  <span className="mt-0.5 block font-mono text-[13px] font-bold text-ink">
                    {money(hold!.fee)}
                  </span>
                  <span className="font-mono text-[9.5px] text-steel">non-refundable</span>
                </div>
                <div className="chip rounded-xl p-3">
                  <span className="block font-mono text-[9px] uppercase tracking-[0.14em] text-steel">
                    Deposit · escrowed
                  </span>
                  <span className="mt-0.5 block font-mono text-[13px] font-bold text-mint">
                    {money(hold!.deposit)}
                  </span>
                  <span className="font-mono text-[9.5px] text-steel">credited at booking</span>
                </div>
              </div>

              {confirmRelease ? (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={dropHold}
                    disabled={holdBusy}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-danger/60 bg-danger/10 px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-danger disabled:opacity-60"
                  >
                    <LockOpen className="size-3.5" />
                    {holdBusy ? "releasing…" : `Refund ${money(hold!.deposit)}`}
                  </button>
                  <button
                    onClick={() => setConfirmRelease(false)}
                    className="font-mono text-[10px] uppercase tracking-[0.14em] text-steel hover:text-ink"
                  >
                    keep the hold
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmRelease(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-edge px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-steel transition-colors hover:border-steel/60 hover:text-ink"
                >
                  <LockOpen className="size-3.5" />
                  Release hold
                </button>
              )}
            </div>
          </div>
          {confirmRelease && (
            <p className="mt-3 font-mono text-[11px] text-steel">
              Releasing returns {money(hold!.deposit)} from escrow. The {money(hold!.fee)} hold fee
              is not refunded, and the seat goes back on sale immediately.
            </p>
          )}
        </section>
      ) : holdLive && holdFlight ? (
        <section className="mt-4 rounded-2xl border border-amber/45 bg-amber/[0.06] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-amber">
                <TriangleAlert className="size-3.5" />
                your hold is on another flight
              </p>
              <p className="mt-2 text-[15px] text-ink">
                {holdFlight.airline} {holdFlight.flightNo} is held for{" "}
                <span className="font-mono text-amber">{fmtCountdown(holdLeft)}</span>. Booking{" "}
                {f.airline} {f.flightNo} instead means letting that hold go — the {money(hold!.fee)}{" "}
                fee is not refunded.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => {
                  setFlightId(holdFlight.id);
                  saveSelection({ flightId: holdFlight.id, fareIndex });
                }}
                className="rounded-lg border border-edge px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-steel transition-colors hover:border-steel/60 hover:text-ink"
              >
                Back to held flight
              </button>
              <button
                onClick={() => takeHold(f.id)}
                disabled={holdBusy || !gate.ok}
                className="chrome bevel rounded-lg px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-void disabled:opacity-60"
              >
                {holdBusy ? "moving…" : `Move hold here · ${money(quote.fee)}`}
              </button>
            </div>
          </div>
        </section>
      ) : hold && (hold.status === "released" || hold.status === "expired") ? (
        <section className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-edge bg-panel p-5">
          <div>
            <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-steel">
              <LockOpen className="size-3.5" />
              hold {hold.status}
            </p>
            <p className="mt-2 text-[15px] text-ink">
              {money(hold.deposit)} deposit refunded from escrow.{" "}
              <span className="text-steel">
                The {money(hold.fee)} fee covered the time the seat was off the market.
              </span>
            </p>
            {hold.refundTx && (
              <p className="mt-1.5 font-mono text-[10.5px] text-steel">
                refund tx {shortTx(hold.refundTx)}
              </p>
            )}
          </div>
          <button
            onClick={() => takeHold(f.id)}
            disabled={holdBusy || !gate.ok}
            className="chrome bevel rounded-lg px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-void disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-2">
              <Lock className="size-3.5" />
              {holdBusy ? "holding…" : `Hold this seat again · ${money(quote.fee)}`}
            </span>
          </button>
        </section>
      ) : (
        <section className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-edge bg-panel p-5">
          <div>
            <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-steel">
              <Lock className="size-3.5" />
              seat not held
            </p>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink">
              {f.seatsLeft} seats left at this fare — anyone can take them while you decide. Hold it
              for {trip.holdHours}h: {money(quote.fee)} fee, plus {money(quote.deposit)} escrowed as
              a deposit that comes off your ticket price.
            </p>
            {!gate.ok && (
              <p className="mt-1.5 font-mono text-[11px] text-amber">
                blocked by your policy · {gate.reason}
              </p>
            )}
          </div>
          <button
            onClick={() => takeHold(f.id)}
            disabled={holdBusy || !gate.ok}
            className="chrome bevel rounded-lg px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-void disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="inline-flex items-center gap-2">
              <Lock className="size-3.5" />
              {holdBusy ? "holding…" : `Hold this seat · ${money(quote.fee)}`}
            </span>
          </button>
        </section>
      )}

      {/* options the agent unlocked */}
      <section className="mt-9">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-xl font-semibold tracking-tight">
            {catalog.loading ? "Pricing live fares" : `${catalog.flights.length} options unlocked`}
            <span className="ml-2 font-mono text-[12px] font-normal text-steel">
              ranked against your {money(trip.budget)} budget
            </span>
          </h2>
          <p className="font-mono text-[11px] text-steel">round trip · per person · taxes in</p>
        </div>
        <div className="mt-4 space-y-3">
          {catalog.loading &&
            [0, 1, 2, 3].map((i) => (
              <div
                key={`skeleton-${i}`}
                className="flex items-center gap-4 rounded-2xl border border-edge bg-panel p-5"
              >
                <div className="size-10 shrink-0 animate-pulse rounded-lg bg-white/[0.06]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-28 animate-pulse rounded bg-white/[0.06]" />
                  <div className="h-2.5 w-full max-w-md animate-pulse rounded bg-white/[0.04]" />
                </div>
                <div className="h-5 w-16 animate-pulse rounded bg-white/[0.06]" />
              </div>
            ))}
          {!catalog.loading &&
            catalog.flights.map((opt) => (
              <OptionRow
                key={opt.id}
                f={opt}
                selected={opt.id === f.id}
                budget={trip.budget}
                onSelect={() => {
                  setFlightId(opt.id);
                  setFareIndex(1);
                  pinned.current = true;
                  saveSelection({ flightId: opt.id, fareIndex: 1 });
                }}
              />
            ))}
        </div>
      </section>

      {/* full detail of the selected option */}
      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AirlineMark code={f.code} className="size-11" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-steel">
                selected itinerary
              </p>
              <h2 className="mt-1 text-xl font-semibold leading-tight tracking-tight">
                {f.airline} {f.flightNo}
                {back ? ` / ${back.flightNo}` : ""}
              </h2>
              <p className="font-mono text-[11px] text-steel">
                {f.fromCode} → {f.toCode} → {f.fromCode} · {f.cabin} · {f.aircraft}
              </p>
            </div>
          </div>
          <Amenities list={f.amenities} className="gap-2.5" />
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <LegTimeline
            label="Outbound"
            date={fmtDate(trip.depart, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
            duration={f.duration}
            departTime={f.departTime}
            arriveTime={f.arriveTime}
            nextDay={f.nextDay}
            origin={{
              code: f.fromCode,
              city: f.fromCity,
              airport: f.fromAirport,
              terminal: f.fromTerminal,
            }}
            destination={{
              code: f.toCode,
              city: f.toCity,
              airport: f.toAirport,
              terminal: f.toTerminal,
            }}
            airline={f.airline}
            flightNo={f.flightNo}
            aircraft={f.aircraft}
            cabin={f.cabin}
            amenities={f.amenities}
          />
          {back ? (
            <LegTimeline
              label="Return"
              date={fmtDate(trip.ret, { weekday: "long", month: "short", day: "numeric" })}
              duration={back.duration}
              departTime={back.departTime}
              arriveTime={back.arriveTime}
              origin={{
                code: f.toCode,
                city: f.toCity,
                airport: f.toAirport,
                terminal: back.fromTerminal,
              }}
              destination={{
                code: f.fromCode,
                city: f.fromCity,
                airport: f.fromAirport,
                terminal: back.toTerminal,
              }}
              airline={f.airline}
              flightNo={back.flightNo}
              aircraft={back.aircraft}
              cabin={f.cabin}
              amenities={f.amenities}
            />
          ) : (
            <div className="flex flex-col justify-center gap-3 rounded-2xl border border-dashed border-edge bg-panel p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded bg-white/[0.06] px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-steel">
                  Return
                </span>
                <span className="font-mono text-[12px] text-steel">
                  {fmtDate(trip.ret, { weekday: "long", month: "short", day: "numeric" })}
                </span>
              </div>
              <p className="text-[13px] leading-relaxed text-steel">
                The {money(f.price)} shown is the round-trip total for this outbound. Google Flights
                prices return options once an outbound is chosen — the agent picks it at booking.
              </p>
            </div>
          )}
        </div>

        {/* hard facts */}
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {facts.map((s) => (
            <div key={s.k} className="chip rounded-xl p-3.5">
              <s.icon className="size-4 text-mint/80" />
              <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-steel">
                {s.k}
              </p>
              <p className="mt-0.5 font-mono text-[13px] font-medium text-ink">{s.v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* fare options */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">
          Choose your fare
          <span className="ml-2 font-mono text-[12px] font-normal text-steel">
            {f.cabin} · {f.airline}
          </span>
        </h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {f.fares.map((opt, i) => (
            <FareCard
              key={opt.name}
              fare={opt}
              selected={i === fareIndex}
              price={f.price + opt.delta}
              onSelect={() => {
                setFareIndex(i);
                saveSelection({ flightId: f.id, fareIndex: i });
              }}
            />
          ))}
        </div>
      </section>

      {/* price breakdown + book */}
      <section className="mt-4 mb-12 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-edge bg-panel p-5 lg:col-span-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-steel">
            Price breakdown
          </p>
          <dl className="mt-3 space-y-2 font-mono text-[13px]">
            <div className="flex justify-between">
              <dt className="text-steel">
                Base fare · {trip.passengers} × {f.cabin}
              </dt>
              <dd className="text-ink">{money(f.base * trip.passengers)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-steel">Taxes & carrier charges{f.live ? " · est. split" : ""}</dt>
              <dd className="text-ink">{money(f.taxes * trip.passengers)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-steel">{fare.name} fare options</dt>
              <dd className="text-ink">
                {fare.delta === 0 ? "included" : `+${money(fare.delta * trip.passengers)}`}
              </dd>
            </div>
            {holdApplies && (
              <>
                <div className="flex justify-between">
                  <dt className="text-steel">Hold fee · non-refundable</dt>
                  <dd className="text-steel">{money(hold!.fee)} paid</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-mint">Deposit in escrow · credited</dt>
                  <dd className="text-mint">−{money(hold!.deposit)}</dd>
                </div>
              </>
            )}
            <div className="flex justify-between border-t border-edge pt-2">
              <dt className="text-steel">Agent data cost · x402</dt>
              <dd className="text-mint">{agentRun.paid} HBAR (already paid)</dd>
            </div>
            {holdApplies && (
              <div className="flex justify-between border-t border-edge pt-2 text-[14px]">
                <dt className="font-bold text-ink">Balance due today</dt>
                <dd className="font-bold text-mint">{money(balanceDue)}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-mint/40 bg-mint/[0.06] p-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-steel">
              {holdApplies ? "Balance due" : "Total"} · {trip.passengers}{" "}
              {trip.passengers > 1 ? "travellers" : "traveller"}
            </p>
            <p className="mt-1 font-mono text-3xl font-bold text-mint">
              {money(holdApplies ? balanceDue : total)}
            </p>
            {holdApplies ? (
              <p className="mt-1 font-mono text-[11px] text-steel">
                {money(total)} total · {money(hold!.deposit)} already in escrow
              </p>
            ) : (
              <p className="mt-1 font-mono text-[11px] text-steel">
                {money(perPerson)} per person ·{" "}
                {withinBudget ? (
                  <span className="text-mint">{money(trip.budget - perPerson)} under budget</span>
                ) : (
                  <span className="text-danger">{money(perPerson - trip.budget)} over budget</span>
                )}
              </p>
            )}
            {holdApplies && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded bg-mint/15 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-mint">
                <BadgeCheck className="size-3.5" />
                price locked · {fmtCountdown(holdLeft)}
              </p>
            )}
          </div>
          <button
            onClick={book}
            className="chrome bevel mt-5 w-full rounded-xl py-3.5 font-mono text-sm font-bold uppercase tracking-[0.12em] text-void transition-transform active:scale-[0.99]"
          >
            {holdApplies ? `Confirm & pay ${money(balanceDue)}` : "Confirm & book"}
          </button>
          <p className="mt-2 text-center font-mono text-[10px] text-steel">
            {holdApplies
              ? "your deposit is applied at checkout — nothing charged yet"
              : "you sign once — nothing charged yet"}
          </p>
        </div>
      </section>
    </Shell>
  );
}
