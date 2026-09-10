# Flight data keys

`.env` here holds the SerpApi key used for live Google Flights pricing:

```
FLIGHT_SERPAPI="<serpapi key>"
```

It is read **server-side only**, by `backend/seller/src/lib/serpapi.ts`
(`serpApiKey()` looks at `process.env.FLIGHT_SERPAPI` first, then this file).
The browser never sees it.

## How the live data flows

```
frontend  →  GET /flights/catalog        (seller, free)
                 ↓
             SerpApi google_flights      (cached 12h in backend/seller/.cache)
                 ↓
             2 live rows + demo rows  →  frontend list
```

- The free SerpApi plan is metered (100 searches/month), so every query is
  cached on disk for 12 hours and a **stale cache is served if the API fails** —
  the demo never goes blank.
- Live rows are tagged `live: true` and render a `LIVE FARE` chip; the rest of
  the list is the demo inventory in `backend/seller/src/data/flights.ts`.
- To force a fresh call, delete `backend/seller/.cache/`.
