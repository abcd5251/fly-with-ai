import { Resend } from "resend";

// Types for flight match notification
export type FlightMatchData = {
  id: string;
  airline: string;
  flightNo: string;
  fromCode: string;
  toCode: string;
  departTime: string;
  arriveTime: string;
  duration: string;
  price: number;
  stops: number;
};

export type TripData = {
  from: string;
  fromCode: string;
  to: string;
  toCode: string;
  depart: string;
  ret: string;
  budget: number;
  passengers: number;
  cabin: string;
  email: string;
};

export type HoldData = {
  holdId?: string;
  fee?: number;
  deposit?: number;
  expiresAt?: string;
};

const resendApiKey = () => process.env.RESEND_API_KEY;
const emailFrom = () => process.env.EMAIL_FROM || "agent@fly402.ai";
const appUrl = () => process.env.APP_URL || "http://localhost:5173";

/**
 * Build a deep link to the /flight page with flight and trip data encoded.
 */
export function buildDeepLink(flight: FlightMatchData, trip: TripData): string {
  const tripEncoded = Buffer.from(JSON.stringify(trip)).toString("base64url");
  const params = new URLSearchParams({
    flightId: flight.id,
    tripData: tripEncoded,
  });
  return `${appUrl()}/flight?${params.toString()}`;
}

/**
 * Format a price as USD.
 */
function money(n: number): string {
  const v = Math.round(n * 100) / 100;
  return `$${v.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(v) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format a date string (YYYY-MM-DD) for display.
 */
function fmtDate(value: string): string {
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Build HTML email content for a flight match notification.
 */
function buildEmailHtml(
  flight: FlightMatchData,
  trip: TripData,
  hold: HoldData | null,
  deepLink: string
): string {
  const savings = trip.budget - flight.price;
  const savingsText = savings > 0 ? `${money(savings)} under your ${money(trip.budget)} budget` : "";

  const holdSection = hold?.holdId
    ? `
      <div style="background: #0d2922; border: 1px solid rgba(70, 240, 192, 0.3); border-radius: 12px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; color: #46F0C0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: bold;">
          Seat Held
        </p>
        <p style="margin: 8px 0 0; color: #E8ECF0; font-size: 14px;">
          Price locked at ${money(flight.price)} per person
        </p>
        <div style="margin-top: 12px; display: flex; gap: 16px;">
          <div>
            <p style="margin: 0; color: #8B9AAB; font-size: 11px;">Hold Fee</p>
            <p style="margin: 4px 0 0; color: #E8ECF0; font-size: 14px; font-weight: bold;">${money(hold.fee ?? 0)}</p>
          </div>
          <div>
            <p style="margin: 0; color: #8B9AAB; font-size: 11px;">Deposit (Escrowed)</p>
            <p style="margin: 4px 0 0; color: #46F0C0; font-size: 14px; font-weight: bold;">${money(hold.deposit ?? 0)}</p>
          </div>
        </div>
      </div>
    `
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flight Match Found</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0A0F0D; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background: linear-gradient(135deg, #46F0C0, #2DD4A8); padding: 8px 16px; border-radius: 8px;">
        <span style="font-family: monospace; font-weight: bold; font-size: 14px; color: #0A0F0D;">402</span>
      </div>
      <p style="margin: 12px 0 0; color: #46F0C0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.25em; font-family: monospace;">
        ${hold?.holdId ? "Seat Held" : "Match Found"}
      </p>
    </div>

    <!-- Main Card -->
    <div style="background: #111916; border: 1px solid #2A3836; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
      <!-- Flight Info -->
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
        <div style="background: linear-gradient(135deg, #46F0C0, #2DD4A8); width: 48px; height: 48px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
          <span style="font-family: monospace; font-weight: bold; font-size: 12px; color: #0A0F0D;">${flight.airline.slice(0, 2).toUpperCase()}</span>
        </div>
        <div>
          <p style="margin: 0; color: #E8ECF0; font-size: 18px; font-weight: 600;">${flight.airline} ${flight.flightNo}</p>
          <p style="margin: 4px 0 0; color: #8B9AAB; font-size: 13px;">${flight.fromCode} → ${flight.toCode} · ${flight.stops === 0 ? "Direct" : `${flight.stops} stop`} · ${flight.duration}</p>
        </div>
      </div>

      <!-- Route & Times -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-top: 1px solid #2A3836; border-bottom: 1px solid #2A3836;">
        <div>
          <p style="margin: 0; color: #E8ECF0; font-size: 28px; font-weight: bold; font-family: monospace;">${flight.departTime}</p>
          <p style="margin: 4px 0 0; color: #8B9AAB; font-size: 12px;">${trip.fromCode}</p>
        </div>
        <div style="text-align: center; flex: 1; padding: 0 16px;">
          <p style="margin: 0; color: #8B9AAB; font-size: 12px;">${flight.duration}</p>
          <div style="height: 1px; background: #2A3836; margin: 8px 0; position: relative;">
            <span style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #46F0C0;">✈</span>
          </div>
          <p style="margin: 0; color: #46F0C0; font-size: 12px;">${flight.stops === 0 ? "Direct" : `${flight.stops} stop`}</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; color: #E8ECF0; font-size: 28px; font-weight: bold; font-family: monospace;">${flight.arriveTime}</p>
          <p style="margin: 4px 0 0; color: #8B9AAB; font-size: 12px;">${trip.toCode}</p>
        </div>
      </div>

      <!-- Price -->
      <div style="margin-top: 20px; text-align: center;">
        <p style="margin: 0; color: #46F0C0; font-size: 36px; font-weight: bold; font-family: monospace;">${money(flight.price)}</p>
        <p style="margin: 4px 0 0; color: #8B9AAB; font-size: 13px;">per person · round trip · taxes included</p>
        ${savingsText ? `<p style="margin: 8px 0 0; color: #46F0C0; font-size: 14px; font-weight: 500;">${savingsText}</p>` : ""}
      </div>

      ${holdSection}

      <!-- CTA Button -->
      <a href="${deepLink}" style="display: block; background: linear-gradient(135deg, #46F0C0, #2DD4A8); color: #0A0F0D; text-decoration: none; text-align: center; padding: 16px 24px; border-radius: 12px; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 24px;">
        ${hold?.holdId ? "View Flight & Book" : "View Flight Details"}
      </a>
    </div>

    <!-- Trip Summary -->
    <div style="background: #111916; border: 1px solid #2A3836; border-radius: 12px; padding: 16px;">
      <p style="margin: 0 0 12px; color: #8B9AAB; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; font-family: monospace;">Trip Summary</p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div>
          <p style="margin: 0; color: #8B9AAB; font-size: 11px;">Route</p>
          <p style="margin: 4px 0 0; color: #E8ECF0; font-size: 13px;">${trip.from} → ${trip.to}</p>
        </div>
        <div>
          <p style="margin: 0; color: #8B9AAB; font-size: 11px;">Dates</p>
          <p style="margin: 4px 0 0; color: #E8ECF0; font-size: 13px;">${fmtDate(trip.depart)} - ${fmtDate(trip.ret)}</p>
        </div>
        <div>
          <p style="margin: 0; color: #8B9AAB; font-size: 11px;">Travellers</p>
          <p style="margin: 4px 0 0; color: #E8ECF0; font-size: 13px;">${trip.passengers} · ${trip.cabin}</p>
        </div>
        <div>
          <p style="margin: 0; color: #8B9AAB; font-size: 11px;">Budget</p>
          <p style="margin: 4px 0 0; color: #E8ECF0; font-size: 13px;">${money(trip.budget)} / person</p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px;">
      <p style="margin: 0; color: #8B9AAB; font-size: 12px;">
        Sent by your autonomous flight agent on Hedera x402
      </p>
      <p style="margin: 8px 0 0; color: #5C6B7A; font-size: 11px; font-family: monospace;">
        fly402.ai · x402 payment protocol
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Build plain text email content for fallback.
 */
function buildEmailText(
  flight: FlightMatchData,
  trip: TripData,
  hold: HoldData | null,
  deepLink: string
): string {
  const savings = trip.budget - flight.price;
  const savingsText = savings > 0 ? `${money(savings)} under your ${money(trip.budget)} budget` : "";

  let text = `
${hold?.holdId ? "SEAT HELD" : "MATCH FOUND"} - ${flight.airline} ${flight.flightNo}

Flight Details:
- Route: ${flight.fromCode} → ${flight.toCode}
- Time: ${flight.departTime} → ${flight.arriveTime}
- Duration: ${flight.duration}
- Stops: ${flight.stops === 0 ? "Direct" : `${flight.stops} stop`}
- Price: ${money(flight.price)} per person (round trip, taxes included)
${savingsText ? `- ${savingsText}` : ""}
`;

  if (hold?.holdId) {
    text += `
Seat Hold:
- Hold Fee: ${money(hold.fee ?? 0)} (non-refundable)
- Deposit: ${money(hold.deposit ?? 0)} (escrowed, refundable)
`;
  }

  text += `
Trip Summary:
- Route: ${trip.from} → ${trip.to}
- Dates: ${fmtDate(trip.depart)} - ${fmtDate(trip.ret)}
- Travellers: ${trip.passengers} · ${trip.cabin}
- Budget: ${money(trip.budget)} / person

View and book your flight: ${deepLink}

---
Sent by your autonomous flight agent on Hedera x402
fly402.ai · x402 payment protocol
`;

  return text.trim();
}

export type SendFlightMatchEmailResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

/**
 * Send a flight match notification email.
 */
export async function sendFlightMatchEmail(
  flight: FlightMatchData,
  trip: TripData,
  hold: HoldData | null = null
): Promise<SendFlightMatchEmailResult> {
  const apiKey = resendApiKey();
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not configured — skipping email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const resend = new Resend(apiKey);
  const deepLink = buildDeepLink(flight, trip);

  const subject = hold?.holdId
    ? `Seat held: ${flight.airline} ${flight.flightNo} for ${money(flight.price)} - ${flight.fromCode} → ${flight.toCode}`
    : `Flight found: ${flight.airline} ${flight.flightNo} for ${money(flight.price)} - ${flight.fromCode} → ${flight.toCode}`;

  try {
    const { data, error } = await resend.emails.send({
      from: emailFrom(),
      to: trip.email,
      subject,
      html: buildEmailHtml(flight, trip, hold, deepLink),
      text: buildEmailText(flight, trip, hold, deepLink),
    });

    if (error) {
      console.error("[email] Failed to send:", error);
      return { success: false, error: error.message };
    }

    console.log(`[email] Sent match notification to ${trip.email} · id: ${data?.id}`);
    return { success: true, messageId: data?.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[email] Exception sending email:", msg);
    return { success: false, error: msg };
  }
}
