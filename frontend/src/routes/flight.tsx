import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Armchair,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Coins,
  Leaf,
  Luggage,
  MonitorPlay,
  Plane,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  Users,
  UtensilsCrossed,
  Wallet,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { Shell } from "@/components/Shell";
import {
  agentRun,
  defaultTrip,
  fmtDate,
  flightById,
  flights,
  loadSelection,
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
        {f.tag && (
          <span className="rounded bg-mint/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-mint">
            {f.tag}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 rounded bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-steel">
          <Leaf className="size-3 text-mint/80" />-{f.co2}% CO₂e · {f.trees} trees/day
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
          <p className="font-mono text-[11px] text-steel">
            Terminal {origin.terminal.replace("T", "")}
          </p>
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
          <p className="font-mono text-[11px] text-steel">
            Terminal {destination.terminal.replace("T", "")}
          </p>
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

  useEffect(() => {
    setTrip(loadTrip());
    const sel = loadSelection();
    setFlightId(sel.flightId);
    setFareIndex(sel.fareIndex);
  }, []);

  const f = flightById(flightId);
  const back = returnLegFor(f.id);
  const fare = f.fares[fareIndex] ?? f.fares[0]!;
  const perPerson = f.price + fare.delta;
  const total = perPerson * trip.passengers;
  const withinBudget = perPerson <= trip.budget;

  const facts = [
    { icon: Plane, k: "Aircraft", v: f.aircraft },
    { icon: Armchair, k: "Seat pitch", v: f.legroom },
    { icon: Clock, k: "On-time rate", v: `${f.onTime}%` },
    { icon: Leaf, k: "CO₂e", v: `-${f.co2}% vs avg` },
    { icon: Users, k: "Seats left", v: `${f.seatsLeft} at this fare` },
    { icon: TrendingDown, k: "Price trend", v: "Lowest in 21 days" },
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

      {/* options the agent unlocked */}
      <section className="mt-9">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-xl font-semibold tracking-tight">
            {flights.length} options unlocked
            <span className="ml-2 font-mono text-[12px] font-normal text-steel">
              ranked against your {money(trip.budget)} budget
            </span>
          </h2>
          <p className="font-mono text-[11px] text-steel">round trip · per person · taxes in</p>
        </div>
        <div className="mt-4 space-y-3">
          {flights.map((opt) => (
            <OptionRow
              key={opt.id}
              f={opt}
              selected={opt.id === f.id}
              budget={trip.budget}
              onSelect={() => {
                setFlightId(opt.id);
                setFareIndex(1);
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
                {f.airline} {f.flightNo} / {back.flightNo}
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
              <dt className="text-steel">Taxes & carrier charges</dt>
              <dd className="text-ink">{money(f.taxes * trip.passengers)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-steel">{fare.name} fare options</dt>
              <dd className="text-ink">
                {fare.delta === 0 ? "included" : `+${money(fare.delta * trip.passengers)}`}
              </dd>
            </div>
            <div className="flex justify-between border-t border-edge pt-2">
              <dt className="text-steel">Agent data cost · x402</dt>
              <dd className="text-mint">{agentRun.paid} HBAR (already paid)</dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-mint/40 bg-mint/[0.06] p-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-steel">
              Total · {trip.passengers} {trip.passengers > 1 ? "travellers" : "traveller"}
            </p>
            <p className="mt-1 font-mono text-3xl font-bold text-mint">{money(total)}</p>
            <p className="mt-1 font-mono text-[11px] text-steel">
              {money(perPerson)} per person ·{" "}
              {withinBudget ? (
                <span className="text-mint">{money(trip.budget - perPerson)} under budget</span>
              ) : (
                <span className="text-danger">{money(perPerson - trip.budget)} over budget</span>
              )}
            </p>
          </div>
          <button
            onClick={book}
            className="chrome bevel mt-5 w-full rounded-xl py-3.5 font-mono text-sm font-bold uppercase tracking-[0.12em] text-void transition-transform active:scale-[0.99]"
          >
            Confirm &amp; book
          </button>
          <p className="mt-2 text-center font-mono text-[10px] text-steel">
            you sign once on Hedera — nothing charged yet
          </p>
        </div>
      </section>
    </Shell>
  );
}
