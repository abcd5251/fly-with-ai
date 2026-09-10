import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Loader2, AlertCircle, Lock } from "lucide-react";
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
import { confirmBooking, type BookingConfirmation } from "@/lib/api";
import { coversFlight, loadHold, markBooked, shortTx, type Hold } from "@/lib/hold";
import { getWalletAddress } from "@/lib/x402-client";

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
        content: "Pay $0.10 USDC to confirm the booking the agent found for you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Booking,
});

type BookingState = "ready" | "signing" | "processing" | "done" | "error";

function Booking() {
  const [trip, setTrip] = useState<Trip>(defaultTrip);
  const [flightId, setFlightId] = useState(matchedFlight.id);
  const [fareIndex, setFareIndex] = useState(1);
  const [state, setState] = useState<BookingState>("ready");
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>("Loading...");
  const [hold, setHold] = useState<Hold | null>(null);

  useEffect(() => {
    setTrip(loadTrip());
    const sel = loadSelection();
    setFlightId(sel.flightId);
    setFareIndex(sel.fareIndex);
    setHold(loadHold());
    try {
      setWalletAddress(getWalletAddress());
    } catch {
      setWalletAddress("Not configured");
    }
  }, []);

  const f = flightById(flightId);
  const back = returnLegFor(f.id);
  const fare = f.fares[fareIndex] ?? f.fares[0]!;
  const total = (f.price + fare.delta) * trip.passengers;
  const holdApplies =
    !!hold && hold.status === "held" && hold.expiresAt > Date.now() && coversFlight(hold, f.id);
  const credit = holdApplies ? hold!.deposit : 0;
  const balanceDue = Math.max(0, total - credit);

  const handleConfirm = async () => {
    setState("signing");
    setError(null);

    try {
      setState("processing");
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
      console.error("Booking error:", err);
      setError(err instanceof Error ? err.message : "Payment failed. Please try again.");
      setState("error");
    }
  };

  const isProcessing = state === "signing" || state === "processing";

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
            {state === "done" ? "booked" : "confirm & pay"}
          </p>
          <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-tight">
            {state === "done" ? "Booking confirmed" : "Ready to book"}
          </h1>

          <div className="mt-5 rounded-xl border border-edge bg-panel p-5 font-mono text-[13px]">
            {[
              { k: "Airline", v: `${f.airline} · ${f.stops === 0 ? "direct" : `${f.stops} stop`}` },
              { k: "Flights", v: `${f.flightNo} / ${back.flightNo}` },
              { k: "Route", v: `${f.fromCode} → ${f.toCode}` },
              { k: "Dates", v: `${fmtDate(trip.depart)} – ${fmtDate(trip.ret)}` },
              { k: "Travellers", v: `${trip.passengers} · ${f.cabin}` },
              { k: "Fare", v: `${fare.name}` },
              { k: "Payment", v: "$0.10 USDC · Base Sepolia" },
            ].map((s) => (
              <div key={s.k} className="flex justify-between py-1.5">
                <span className="text-steel">{s.k}</span>
                <span className="text-ink">{s.v}</span>
              </div>
            ))}
            <div className="mt-1 flex justify-between border-t border-edge pt-2.5">
              <span className="text-steel">Ticket total</span>
              <span className="text-ink">{money(total)}</span>
            </div>
            {holdApplies && (
              <>
                <div className="flex justify-between py-1.5">
                  <span className="text-steel">Hold fee · paid</span>
                  <span className="text-steel">{money(hold!.fee)}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-mint">Deposit in escrow · credited</span>
                  <span className="text-mint">−{money(hold!.deposit)}</span>
                </div>
              </>
            )}
            <div className="mt-1 flex justify-between border-t border-edge pt-2.5">
              <span className="text-steel">{holdApplies ? "Balance due" : "Due now"}</span>
              <span className="text-base font-bold text-mint">{money(balanceDue)}</span>
            </div>
          </div>

          {holdApplies && (
            <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-mint/35 bg-mint/[0.06] px-4 py-2.5 font-mono text-[11px] text-mint">
              <Lock className="size-3.5 shrink-0" />
              <span>
                seat held · deposit {money(hold!.deposit)} in escrow {shortTx(hold!.escrow)}
              </span>
            </div>
          )}

          {/* Wallet info */}
          <div className="mt-3 rounded-lg bg-white/5 px-4 py-2.5 font-mono text-[11px]">
            <span className="text-steel">Wallet: </span>
            <span className="text-ink">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </span>
          </div>

          {state === "done" && confirmation ? (
            <div className="mt-5 rounded-lg border border-mint/40 bg-mint/10 px-4 py-3 font-mono text-[13px] text-mint">
              <p className="font-bold">Payment confirmed</p>
              <p className="mt-1">Confirmation: {confirmation.code}</p>
            </div>
          ) : state === "error" ? (
            <div className="mt-5 space-y-3">
              <div className="flex items-start gap-2 rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-3 font-mono text-[13px] text-red-400">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => setState("ready")}
                className="chrome bevel w-full rounded-xl py-3.5 font-mono text-sm font-bold uppercase tracking-[0.12em] text-void"
              >
                Try again
              </button>
            </div>
          ) : (
            <button
              disabled={isProcessing}
              onClick={handleConfirm}
              className="chrome bevel mt-5 w-full rounded-xl py-3.5 font-mono text-sm font-bold uppercase tracking-[0.12em] text-void disabled:opacity-60"
            >
              {isProcessing ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  {state === "signing" ? "Signing..." : "Processing payment..."}
                </span>
              ) : (
                "Confirm & Pay $0.10"
              )}
            </button>
          )}
          <p className="mt-3 font-mono text-[11px] text-steel">
            {state === "done"
              ? "Your e-ticket will be sent to your email."
              : "x402 payment · the agent handled the rest."}
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
              ...(holdApplies
                ? [`Held the seat · ${money(hold!.fee)} fee, ${money(hold!.deposit)} escrowed`]
                : []),
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
              ) : isProcessing ? (
                <Loader2 className="size-3.5 shrink-0 animate-spin" />
              ) : (
                <span className="size-3.5 text-center">•</span>
              )}
              {state === "done"
                ? "Booking confirmed"
                : isProcessing
                  ? "Processing x402 payment..."
                  : "Awaiting payment"}
            </li>
          </ol>
        </div>
      </section>
    </Shell>
  );
}
