# Study Community

The Study Community is a persistent, authenticated study-room feature built on the existing Next.js app and libSQL/SQLite database.

## Included

- A dashboard linked from the main level navigation and the mobile account menu.
- Public and invite-only rooms, room capacity, join approval, host handoff, room membership, presence opt-in, and expiring heartbeats.
- Persisted member chat with server-side membership checks, a 1,000-character limit, and a per-user rate limit.
- A server-timestamp-based shared focus timer with pause, resume, reset, break, and session summaries. Community study time is intentionally not copied into the personal focus vault, so it cannot be double-counted.
- Participant list, raised hands, host approval/rejection/removal, and room termination.
- Room, presence, and message updates are fetched by polling (5 seconds in rooms, 15 seconds on the dashboard). This works without another realtime vendor, but is not a WebSocket connection.
- Interface strings are available in Arabic, German, and English.

## Voice and screen sharing

Voice and screen sharing are not enabled. The UI states this directly and does not show pretend controls. A production integration needs a WebRTC signaling path and a configured SFU/RTC provider (or a maintained peer-to-peer signaling service), plus TURN servers for reliable connections across restrictive networks. Access controls, room authorization, device permissions, and disconnect handling must be connected to that service before enabling either feature.

## Database and deployment

The community tables and indexes are created additively by `src/lib/db/index.ts` using `COMMUNITY_DDL`. Local development uses the existing SQLite database. Production needs the site's configured Turso/libSQL database (`TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`, or the existing `DATABASE_URL`/`DATABASE_AUTH_TOKEN` aliases). The temporary Vercel filesystem database is not persistent and must not be used for real user data.

## Verification

Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` from this app directory. `tests/community.test.ts` covers invite token hashing, presence expiry, server limits, and translation-key parity.
