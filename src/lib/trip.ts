export type Trip = {
  from: string;
  to: string;
  depart: string;
  ret: string;
  budget: number;
};

export const defaultTrip: Trip = {
  from: "Taipei",
  to: "Tokyo",
  depart: "Oct 20, 2026",
  ret: "Oct 25, 2026",
  budget: 500,
};

export const matchedFlight = {
  airline: "ANA",
  code: "NH",
  flightNo: "NH853",
  aircraft: "Boeing 787-9",
  cabin: "Economy",
  fromCode: "TPE",
  toCode: "HND",
  fromAirport: "Taiwan Taoyuan Intl · T1",
  toAirport: "Tokyo Haneda Intl · T2",
  departTime: "10:20",
  arriveTime: "14:25",
  duration: "4h05m",
  price: 428,
  co2: "-19% CO₂e vs avg",
  carryOn: "1 × 7kg",
  checked: "1 × 23kg",
  refundable: "Free cancellation · 24h",
  changes: "Changes from $40",
};

const KEY = "x402-trip";

export function saveTrip(trip: Trip) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(KEY, JSON.stringify(trip));
}

export function loadTrip(): Trip {
  if (typeof window === "undefined") return defaultTrip;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? { ...defaultTrip, ...(JSON.parse(raw) as Trip) } : defaultTrip;
  } catch {
    return defaultTrip;
  }
}
