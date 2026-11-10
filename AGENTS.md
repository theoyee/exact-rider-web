# Rider web engineering notes

This is a standalone Next.js App Router + Tailwind CSS project. Keep it independent of the sibling Expo application.

- Check the installed Next.js version and current official documentation before using framework APIs.
- Keep provider secrets and generic upstream requests on the server. Browser Mapbox tokens must be public and domain-restricted.
- Reuse server response parsers and authoritative backend states. Never simulate a successful booking, payment, driver location or trip completion.
- Keep money in integer minor units at service boundaries.
- Keep active request tokens out of URLs and localStorage; current tab-scoped storage is intentional.
- Preserve abort handling, session guards and Socket.IO cleanup.
- Use semantic controls, keyboard navigation and reduced-motion support. Verify desktop and narrow mobile layouts.
- Run lint, typecheck, unit tests, and production build. Run the mocked browser flow tests for changes to booking/state/navigation.
