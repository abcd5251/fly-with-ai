import { useEffect, useState } from "react";
import { fetchCatalog, type CatalogResponse } from "@/lib/api";
import {
  flights as demoFlights,
  returnLegs as demoReturnLegs,
  type Flight,
  type Trip,
} from "@/lib/trip";

export type Catalog = CatalogResponse & { loading: boolean };

const offline: CatalogResponse = {
  flights: demoFlights,
  returnLegs: demoReturnLegs,
  live: 0,
  source: "none",
  fetchedAt: null,
};

/**
 * The flight list for a trip: live rows from the seller when it answers,
 * the bundled demo inventory when it doesn't. The UI is identical either way —
 * live rows just carry `live: true` and say so.
 */
export function useCatalog(trip: Trip): Catalog {
  const [catalog, setCatalog] = useState<CatalogResponse>(offline);
  const [loading, setLoading] = useState(true);

  const { fromCode, toCode, depart, ret, passengers, directOnly } = trip;

  useEffect(() => {
    let live = true;
    setLoading(true);
    fetchCatalog({ from: fromCode, to: toCode, depart, ret, adults: passengers, directOnly })
      .then((data) => {
        if (!live) return;
        if (data.flights?.length) setCatalog(data);
      })
      .catch(() => {
        // seller not running — the demo inventory keeps the page usable
      })
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [fromCode, toCode, depart, ret, passengers, directOnly]);

  return { ...catalog, loading };
}

export function pickFlight(catalog: Pick<Catalog, "flights">, id: string): Flight {
  return catalog.flights.find((f) => f.id === id) ?? catalog.flights[0]!;
}
