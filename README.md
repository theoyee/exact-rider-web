# Exact Rider Web

A standalone Next.js App Router + Tailwind CSS rider application. It is independent of the Expo app: no React Native dependencies, workspace links, imports from sibling projects, or changes to the mobile repository.

## Run locally

Requires Node.js 22 or newer and npm.

```bash
npm ci
cp .env.example .env.local
# Set the origins and provider credentials in .env.local.
npm run dev
```

Open http://localhost:3000. For the production server:

```bash
npm run build
npm start
```

The initial local checkout may already have `.env.local` with the existing mobile project's rider API/provider configuration mapped to the web variable names. This file is ignored by Git. Never commit it.

## Configuration

| Variable | Where used | Purpose |
| --- | --- | --- |
| `API_ORIGIN` | Server only | Origin of the existing ride backend; e.g. `https://api.example.com`. Do not include `/api/v1`. |
| `NEXT_PUBLIC_REALTIME_ORIGIN` | Browser | Origin of that backend’s Socket.IO server. Allow the web app origin in the backend configuration. |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Browser + server | Public Mapbox token for raster tiles and geocoding. Restrict it to your deployed domains and local development origins. |
| `GOOGLE_PLACES_API_KEY` | Server only | Optional Google Places API (New) key. Search falls back to Mapbox if Google autocomplete is unavailable. |

Maps fall back to OpenStreetMap tiles without a Mapbox token; manual latitude/longitude inputs still work. Address geocoding requires a configured provider. Browser location requires HTTPS or localhost and explicit user permission. Audio can be blocked by the browser until the user interacts with the page.

## Rider journey

- `/`: branded, responsive welcome page, perks, and active-ride resume.
- `/ride`: address autocomplete, precise place resolution, manual addresses/coordinates, browser GPS, live quote request.
- `/ride/estimate`: backend fare/route, subtotal disclosure and continuation, server-clock-adjusted expiry, validity check, refresh.
- `/ride/details`: contact validation and backend-authorized request submission (including subtotal quotes; backend rejections remain visible).
- `/ride/search`: authoritative status polling plus Socket.IO updates, driver counter-offers, rider counter-offers, server-confirmed cancellation.
- `/ride/track`: accepted driver/fare, actual GPS marker and freshness, pickup proximity, arrival chime, route sharing, support.
- `/ride/payment`, `/ride/completed`, `/ride/feedback`: explicit unavailable/pending states until supported by the backend. No fabricated payment, completion, or feedback submissions.
- `/ride/help`: accessible FAQ, support email and copyable request reference.

## Architecture

- `src/app`: routes and thin server API handlers.
- `src/components`: reusable DOM components, accessible dialog, persistent map shell.
- `src/services`: adapted rider API parsers and contracts from the mobile app; browser networking only.
- `src/hooks`: browser location, clocks, one Socket.IO connection and serialized HTTP status refreshes.
- `src/stores/rider.ts`: Zustand state with tab-scoped session persistence for trip/quote and active request. Contact form values are not persisted. The backend action token is session-scoped, never embedded in URLs, and is cleared on starting a new trip.
- `src/app/api/backend/[...path]`: restricted rider-endpoint proxy. Fixed upstream origin, method/path allowlist, body limit, request timeout, no caching, no forwarded cookies.
- `src/app/api/places`: keeps Google credentials on the server and returns normalized address results.

The app uses server-generated fares in integer minor units (kobo). It does not invent fares, drivers, simulated GPS, payment confirmations, trip starts, or completions. A backend explicitly configured for simulation is visibly labelled.

## Backend expectations

The backend must provide the same contracts as the mobile app: quote creation/validity, guest request creation/status, counter/accept-counter/cancel. Socket.IO authenticates with `{ role: 'rider', requestId, token }` and emits `ride:changed` and `ride:driver-location`.

HTTP traffic is proxied through Next.js. WebSockets connect directly to the backend, so production origins, TLS and any reverse proxy WebSocket upgrade settings must be configured there. Do not deploy as a static export: API handlers require a Next.js server.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
# Start production server on 3100 in a separate terminal:
npm start -- --port 3100
npm run test:e2e
```

Playwright tests use the locally installed Chrome channel by default. Set `CHROME_PATH` to use a specific Chrome executable, or configure a Playwright-managed browser in `playwright.config.ts`. Set `E2E_BASE_URL` to test a different local URL. Browser tests mock ride-service responses and never create a real ride or charge a payment.

Tests cover amount handling, input validation, quote clocks, proxy restrictions, backend error propagation, socket authentication/filtering/cleanup, and complete desktop/mobile booking, negotiation, cancellation and refresh recovery.

## Known backend gaps

The provided contract ends at accepted/cancelled/expired requests. It does not expose confirmed journey start/completion, driver vehicle/contact details, online payment settlement, ratings, or reward redemption. Those screens explain availability rather than presenting fake success. The support address and marketing imagery are retained from the mobile UI and should be confirmed before public launch.

Before production launch, run a two-device live ride test, confirm backend/provider origin restrictions, verify support details and reward terms, and integrate the missing lifecycle/payment endpoints as they become available.
# exact-rider-web
