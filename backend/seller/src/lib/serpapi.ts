import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Amenity, Fare, Flight } from "../data/flights.js";

/**
 * Live flight data from SerpApi's Google Flights engine.
 *
 * The free plan is metered (100 searches/month), so every query is cached on
 * disk and a stale cache is still served when the API is down — a demo should
 * never go blank because a quota ran out.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.resolve(here, "../../.cache");
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

export type LiveQuery = {
  from: string;
  to: string;
  depart: string;
  return?: string;
  adults?: number;
  currency?: string;
};

export type PriceInsights = {
  lowest?: number;
  level?: string;
  typicalRange?: [number, number];
};

export type LiveResult = {
  flights: Flight[];
  insights: PriceInsights;
  source: "serpapi" | "serpapi-cache" | "none";
  fetchedAt: string | null;
  error?: string;
};

/** The key lives in backend/api/.env; a plain process env var also works. */
export function serpApiKey(): string | null {
  const fromEnv = process.env["FLIGHT_SERPAPI"] ?? process.env["SERPAPI_KEY"];
  if (fromEnv) return unquote(fromEnv);

  for (const rel of ["../../../api/.env", "../../../../api/.env"]) {
    const file = path.resolve(here, rel);
    if (!fs.existsSync(file)) continue;
    const match = /^\s*(?:FLIGHT_SERPAPI|SERPAPI_KEY)\s*=\s*(\S+)/m.exec(fs.readFileSync(file, "utf8"));
    if (match?.[1]) return unquote(match[1]);
  }
  return null;
}

function unquote(v: string) {
  return v.trim().replace(/^["']|["']$/g, "");
}

export async function searchLiveFlights(query: LiveQuery): Promise<LiveResult> {
  const key = serpApiKey();
  if (!key) {
    return { flights: [], insights: {}, source: "none", fetchedAt: null, error: "no FLIGHT_SERPAPI key" };
  }

  const params = new URLSearchParams({
    engine: "google_flights",
    departure_id: query.from,
    arrival_id: query.to,
    outbound_date: query.depart,
    currency: query.currency ?? "USD",
    adults: String(query.adults ?? 1),
    hl: "en",
    api_key: key,
  });
  if (query.return) params.set("return_date", query.return);

  const cacheFile = path.join(CACHE_DIR, `${cacheKey(query)}.json`);
  const cached = readCache(cacheFile);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { ...parse(cached.body, query), source: "serpapi-cache", fetchedAt: new Date(cached.at).toISOString() };
  }

  try {
    const res = await fetch(`https://serpapi.com/search.json?${params}`);
    if (!res.ok) throw new Error(`SerpApi ${res.status}`);
    const body = (await res.json()) as SerpResponse;
    if (body.error) throw new Error(body.error);
    writeCache(cacheFile, body);
    return { ...parse(body, query), source: "serpapi", fetchedAt: new Date().toISOString() };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // a stale cache beats an empty screen
    if (cached) {
      return {
        ...parse(cached.body, query),
        source: "serpapi-cache",
        fetchedAt: new Date(cached.at).toISOString(),
        error: message,
      };
    }
    return { flights: [], insights: {}, source: "none", fetchedAt: null, error: message };
  }
}

/* ---------------------------------------------------------------- caching */

function cacheKey(q: LiveQuery) {
  const raw = [q.from, q.to, q.depart, q.return ?? "", q.adults ?? 1, q.currency ?? "USD"].join("|");
  return crypto.createHash("sha1").update(raw).digest("hex").slice(0, 16);
}

function readCache(file: string): { at: number; body: SerpResponse } | null {
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as { at: number; body: SerpResponse };
    return raw?.body ? raw : null;
  } catch {
    return null;
  }
}

function writeCache(file: string, body: SerpResponse) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ at: Date.now(), body }));
  } catch {
    /* a read-only disk shouldn't break the response */
  }
}

/* ---------------------------------------------------------------- mapping */

type SerpLeg = {
  departure_airport: { id: string; name: string; time: string };
  arrival_airport: { id: string; name: string; time: string };
  duration: number;
  airplane?: string;
  airline: string;
  travel_class?: string;
  flight_number: string;
  legroom?: string;
  extensions?: string[];
  often_delayed_by_over_30_min?: boolean;
};

type SerpOffer = {
  flights: SerpLeg[];
  total_duration: number;
  price?: number;
  type?: string;
  carbon_emissions?: { this_flight?: number; typical_for_this_route?: number; difference_percent?: number };
  departure_token?: string;
};

type SerpResponse = {
  best_flights?: SerpOffer[];
  other_flights?: SerpOffer[];
  price_insights?: { lowest_price?: number; price_level?: string; typical_price_range?: [number, number] };
  airports?: Array<{
    departure?: Array<{ airport: { id: string; name: string }; city?: string }>;
    arrival?: Array<{ airport: { id: string; name: string }; city?: string }>;
  }>;
  error?: string;
};

function parse(body: SerpResponse, query: LiveQuery) {
  const cities = cityIndex(body);
  const offers = [...(body.best_flights ?? []), ...(body.other_flights ?? [])]
    .filter((o) => typeof o.price === "number" && o.flights?.length)
    .sort((a, b) => (a.price ?? 0) - (b.price ?? 0));

  const flights = offers
    .map((offer, i) => toFlight(offer, i, cities, query))
    .filter((f): f is Flight => f !== null);

  const insights: PriceInsights = {
    ...(body.price_insights?.lowest_price !== undefined && { lowest: body.price_insights.lowest_price }),
    ...(body.price_insights?.price_level !== undefined && { level: body.price_insights.price_level }),
    ...(body.price_insights?.typical_price_range !== undefined && {
      typicalRange: body.price_insights.typical_price_range,
    }),
  };

  return { flights, insights };
}

function cityIndex(body: SerpResponse) {
  const map = new Map<string, string>();
  for (const group of body.airports ?? []) {
    for (const entry of [...(group.departure ?? []), ...(group.arrival ?? [])]) {
      if (entry.city) map.set(entry.airport.id, entry.city.replace(/ City$/, ""));
    }
  }
  return map;
}

function toFlight(
  offer: SerpOffer,
  index: number,
  cities: Map<string, string>,
  query: LiveQuery
): Flight | null {
  const legs = offer.flights;
  const first = legs[0];
  const last = legs[legs.length - 1];
  if (!first || !last || offer.price === undefined) return null;

  const code = first.flight_number.split(/\s+/)[0] ?? "";
  const flightNo = first.flight_number.replace(/\s+/g, "");
  const price = Math.round(offer.price);
  const base = Math.round(price * 0.82);
  const diff = offer.carbon_emissions?.difference_percent ?? 0;

  return {
    id: `live-${flightNo.toLowerCase()}-${index}`,
    airline: first.airline,
    code,
    flightNo,
    aircraft: first.airplane ?? "—",
    cabin: first.travel_class ?? "Economy",
    fromCode: first.departure_airport.id,
    fromCity: cities.get(first.departure_airport.id) ?? query.from,
    fromAirport: cleanAirport(first.departure_airport.name),
    fromTerminal: "",
    toCode: last.arrival_airport.id,
    toCity: cities.get(last.arrival_airport.id) ?? query.to,
    toAirport: cleanAirport(last.arrival_airport.name),
    toTerminal: "",
    departTime: hhmm(first.departure_airport.time),
    arriveTime: hhmm(last.arrival_airport.time),
    nextDay: dayOf(last.arrival_airport.time) !== dayOf(first.departure_airport.time),
    duration: hours(offer.total_duration),
    stops: legs.length - 1,
    price,
    base,
    taxes: price - base,
    seatsLeft: 9,
    co2: -diff,
    trees: Math.round((offer.carbon_emissions?.this_flight ?? 0) / 1000),
    onTime: first.often_delayed_by_over_30_min ? 62 : 87,
    legroom: first.legroom ? `${first.legroom.replace(/\s*in$/, '"')} pitch` : "—",
    amenities: amenitiesFrom(legs),
    live: true,
    co2kg: Math.round((offer.carbon_emissions?.this_flight ?? 0) / 1000),
    oftenDelayed: first.often_delayed_by_over_30_min === true,
    departureToken: offer.departure_token ?? "",
    fares: liveFares(price),
  };
}

function cleanAirport(name: string) {
  return name.replace(/ International Airport$/, " Intl").replace(/ Airport$/, "");
}

function hhmm(stamp: string) {
  return stamp.slice(11, 16);
}

function dayOf(stamp: string) {
  return stamp.slice(0, 10);
}

function hours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

function amenitiesFrom(legs: SerpLeg[]): Amenity[] {
  const text = legs
    .flatMap((l) => l.extensions ?? [])
    .join(" · ")
    .toLowerCase();
  const out: Amenity[] = [];
  if (/outlet|power|usb/.test(text)) out.push("power");
  if (/wi-fi|wifi/.test(text)) out.push("wifi");
  if (/video|entertainment|screen/.test(text)) out.push("screen");
  if (/meal|food included/.test(text)) out.push("meal");
  return out;
}

/**
 * Google Flights quotes one price per itinerary, not a fare ladder, so the
 * upsells are modelled from that live base price. The frontend labels them as
 * estimates; only the Basic price is the real quote.
 */
function liveFares(price: number): Fare[] {
  const standard = Math.max(20, Math.round((price * 0.1) / 2) * 2);
  const flex = Math.max(45, Math.round((price * 0.24) / 2) * 2);
  return [
    {
      name: "Basic",
      note: "Live fare",
      delta: 0,
      carryOn: "1 × 7kg",
      checked: null,
      refund: "Non-refundable",
      refundable: false,
      change: "Change fee applies",
      perks: ["Seat assigned at check-in"],
    },
    {
      name: "Standard",
      note: "Estimated upsell",
      delta: standard,
      recommended: true,
      carryOn: "1 × 7kg",
      checked: "1 × 23kg",
      refund: "Free cancellation within 24h",
      refundable: true,
      change: "Free date change · once",
      perks: ["Free seat selection"],
      bundle: {
        name: "TripFlex · EasyCancel & Change",
        items: ["Cancellation fee waived", "Rebooking fee waived", "24h price-drop refund"],
        value: standard * 3,
      },
    },
    {
      name: "Flex",
      note: "Estimated upsell",
      delta: flex,
      carryOn: "1 × 7kg",
      checked: "2 × 23kg",
      refund: "Free cancellation anytime",
      refundable: true,
      change: "Unlimited free changes",
      perks: ["Priority boarding", "Lounge access · 1 visit"],
    },
  ];
}
