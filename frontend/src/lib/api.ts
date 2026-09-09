import { getX402Fetch } from "./x402-client";
import type { Flight, ReturnLeg } from "./trip";

const API_URL = import.meta.env["VITE_API_URL"] || "http://localhost:4021";

export type FlightSummary = {
  id: string;
  airline: string;
  flightNo: string;
  fromCode: string;
  toCode: string;
  departTime: string;
  arriveTime: string;
  duration: string;
  stops: number;
  price: number;
  seatsLeft: number;
  tag?: string;
};

export type BookingConfirmation = {
  code: string;
  flightNo: string;
  airline: string;
  fare: string;
  passengers: number;
  total: number;
  email: string;
  bookedAt: string;
};

export type BookingResponse = {
  confirmation: BookingConfirmation;
  message: string;
};

export async function searchFlights(): Promise<FlightSummary[]> {
  const res = await fetch(`${API_URL}/flights/search`);
  if (!res.ok) {
    throw new Error(`Failed to search flights: ${res.statusText}`);
  }
  const data = await res.json();
  return data.flights;
}

export async function getFlightDetails(
  id: string
): Promise<{ flight: Flight; returnLeg: ReturnLeg }> {
  const res = await fetch(`${API_URL}/flights/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to get flight details: ${res.statusText}`);
  }
  return res.json();
}

export type BookingData = {
  flightId: string;
  fareIndex: number;
  passengers: number;
  email: string;
};

export async function confirmBooking(data: BookingData): Promise<BookingResponse> {
  const x402Fetch = getX402Fetch();

  const res = await x402Fetch(`${API_URL}/booking`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Booking failed: ${errorText || res.statusText}`);
  }

  return res.json();
}
