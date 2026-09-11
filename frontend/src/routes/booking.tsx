import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, Check, Loader2 } from "lucide-react";
import { Shell } from "@/components/Shell";
import { pickFlight, useCatalog } from "@/hooks/use-catalog";
import {
  defaultTrip,
  fmtDate,
  loadSelection,
  loadTrip,
  matchedFlight,
  money,
  returnLegFor,
  type Trip,
} from "@/lib/trip";
import { confirmBooking, type BookingConfirmation } from "@/lib/api";
import { getWalletAddress } from "@/lib/x402-client";
import { coversFlight, loadHold, markBooked, type Hold } from "@/lib/hold";

export const Route = createFileRoute("/booking")({
  head: () => ({
    meta: [
      { title: "Confirm & Pay — Book Your Flight | TravelPay AI" },
      {
        name: "description",
        content:
          "Your AI agent already evaluated this flight. Pay with x402 to confirm the booking.",
      },
      { property: "og:title", content: "Confirm & Pay — Book Your Flight" },
      {
        property: "og:description",
        content: "Pay 1 HBAR to confirm the booking the agent found for you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Booking,
});

type BookingState = "ready" | "processing" | "done" | "error";

function Booking() {
  const [trip, setTrip] = useState<Trip>(defaultTrip);
  const [flightId, setFlightId] = useState(matchedFlight.id);
  const [fareIndex, setFareIndex] = useState(1);
  const [state, setState] = useState<BookingState>("ready");
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);
  const [hold, setHold] = useState<Hold | null>(null);

  useEffect(() => {
    setTrip(loadTrip());
    const sel = loadSelection();
    setFlightId(sel.flightId);
    setFareIndex(sel.fareIndex);
    setHold(loadHold());
    try {
      const addr = getWalletAddress();
      setWallet(addr.startsWith("0x") ? addr : null);
    } catch {
      setWallet(null);
    }
  }, []);

  const catalog = useCatalog(trip);
  const f = pickFlight(catalog, flightId);
  const back = f.live ? null : (catalog.returnLegs[f.id] ?? returnLegFor(f.id));
  const fare = f.fares[fareIndex] ?? f.fares[0]!;
  const total = (f.price + fare.delta) * trip.passengers;

  const holdApplies =
    !!hold && hold.status === "held" && hold.expiresAt > Date.now() && coversFlight(hold, f.id);
  const credit = holdApplies ? hold!.deposit : 0;
  const dueNow = Math.max(0, total - credit);

  const book = async () => {
    setState("processing");
    setError(null);
    try {
      const result = await confirmBooking({
        flightId,
        fareIndex,
        passengers: trip.passengers,
        email: trip.email,
      });
      setConfirmation(result.confirmation);
      if (holdApplies && hold) setHold(markBooked(hold));
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed. Please try again.");
      setState("error");
    }
  };

  return (
    <Shell>
      <section className="mx-auto max-w-[560px] py-12">
        <Link
          to="/flight"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-steel transition-colors hover:text-mint"
        >
          <ArrowLeft className="size-3.5" />
          Back to flight details
        </Link>

          <div className="mt-5 rounded-xl border border-edge bg-panel p-5 font-mono text-[13px]">
            {[
              { k: "Airline", v: `${f.airline} · ${f.stops === 0 ? "direct" : `${f.stops} stop`}` },
              { k: "Flights", v: `${f.flightNo} / ${back.flightNo}` },
              { k: "Route", v: `${f.fromCode} → ${f.toCode}` },
              { k: "Dates", v: `${fmtDate(trip.depart)} – ${fmtDate(trip.ret)}` },
              { k: "Travellers", v: `${trip.passengers} · ${f.cabin}` },
              { k: "Fare", v: `${fare.name}` },
              { k: "Payment", v: "1 HBAR · Hedera Testnet" },
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

          {/* Account info */}
          {/*<div className="mt-3 rounded-lg bg-white/5 px-4 py-2.5 font-mono text-[11px]">*/}
            {/*<span className="text-steel">Account: </span>*/}
            {/*<span className="text-ink">{walletAddress}</span>*/}
          {/*</div>*/}
        {/*<p className="mt-6 font-mono text-[11px] uppercase tracking-[0.25em] text-mint">*/}
          {/*{state === "done" ? "booked" : "confirm & pay"}*/}
        {/*</p>*/}
        {/*<h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight">*/}
          {/*{state === "done" ? "You're booked" : "Ready to book"}*/}
        {/*</h1>*/}

        {/* what you're buying */}
        <div className="mt-7 rounded-2xl border border-edge bg-panel p-6">
          <div className="flex items-start gap-3.5">
            <span className="chrome bevel grid size-11 shrink-0 place-items-center rounded-lg font-mono text-sm font-bold text-void">
              {f.code}
            </span>
            <div>
              <p className="text-lg font-semibold leading-tight text-ink">
                {f.airline} {f.flightNo}
                {back ? ` / ${back.flightNo}` : ""}
              </p>
              <p className="mt-1 font-mono text-[12.5px] text-steel">
                {f.fromCode} → {f.toCode} · {f.stops === 0 ? "direct" : `${f.stops} stop`} ·{" "}
                {f.duration}
              </p>
              <p className="font-mono text-[12.5px] text-steel">
                {fmtDate(trip.depart)} – {fmtDate(trip.ret)} · {trip.passengers}{" "}
                {trip.passengers > 1 ? "travellers" : "traveller"} · {fare.name}
              </p>
            </div>
          </div>

          <dl className="mt-6 space-y-2 border-t border-edge pt-5 font-mono text-[13px]">
            <div className="flex justify-between">
              <dt className="text-steel">Ticket total</dt>
              <dd className="text-ink">{money(total)}</dd>
            </div>
            {holdApplies && (
              <div className="flex justify-between">
                <dt className="text-mint">Deposit in escrow · credited</dt>
                <dd className="text-mint">−{money(hold!.deposit)}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-edge pt-3">
              <dt className="text-sm font-semibold text-ink">Due now</dt>
              <dd className="font-mono text-2xl font-bold text-mint">{money(dueNow)}</dd>
            </div>
          </dl>
        </div>

        {/* the one action */}
        {state === "done" && confirmation ? (
          <div className="mt-4 rounded-2xl border border-mint/40 bg-mint/10 p-5">
            <p className="flex items-center gap-2 text-[15px] font-semibold text-mint">
              <Check className="size-4" />
              Payment confirmed
            </p>
            <p className="mt-2 font-mono text-[13px] text-ink">Confirmation {confirmation.code}</p>
            <p className="mt-1 font-mono text-[11.5px] text-steel">e-ticket sent to {trip.email}</p>
          </div>
        ) : state === "error" ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-start gap-2.5 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 font-mono text-[12.5px] text-danger">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setState("ready")}
              className="chrome bevel w-full rounded-xl py-4 font-mono text-sm font-bold uppercase tracking-[0.12em] text-void"
            >
              {isProcessing ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  {state === "signing" ? "Signing..." : "Processing payment..."}
                </span>
              ) : (
                "Confirm & Pay 1 HBAR"
              )}
            </button>
          </div>
        ) : (
          <button
            disabled={state === "processing"}
            onClick={book}
            className="chrome bevel mt-4 w-full rounded-xl py-4 font-mono text-sm font-bold uppercase tracking-[0.12em] text-void transition-transform active:scale-[0.99] disabled:opacity-60"
          >
            {state === "processing" ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Paying…
              </span>
            ) : (
              `Confirm & pay ${money(dueNow)}`
            )}
          </button>
        )}

        <p className="mt-3 text-center font-mono text-[11px] text-steel">
          x402 · $0.10 USDC on Base Sepolia
          {wallet ? ` · ${wallet.slice(0, 6)}…${wallet.slice(-4)}` : " · wallet not configured"}
        </p>
      </section>
    </Shell>
  );
}
