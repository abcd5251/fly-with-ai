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
  fromCode: "TPE",
  toCode: "TYO",
  departTime: "10:20",
  arriveTime: "14:25",
  duration: "4h05m",
  price: 428,
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
