# Sprachcafé

Sprachcafé is a separate, authenticated destination for teacher-led German sessions. It reuses the existing Next.js App Router, user sessions and admin role, Drizzle/libSQL database, and UI theme. It does not merge peer study rooms with teacher bookings.

## Teacher and session management

Open **Admin → إدارة Sprachcafé**. Farah (فرح) and Omar Helmy (عمر حلمي) are seeded as editable profile records the first time the database initializes. Only their supplied names are populated. Add verified information through the teacher form; profiles can be published or hidden, and booking can be enabled separately. Private contact details are only returned by admin APIs.

Administrators can create and edit one-off sessions, cancel them, and create/edit/publish/cancel weekly series. Session fields include the teacher, A1–B2 level, category, local start time and IANA time zone, duration, capacity, price, booking cutoff, cancellation cutoff, join window, publication status, and a private HTTPS meeting URL/instructions. No occurrence is published unless the administrator publishes it.

Weekly occurrences are materialized idempotently for the next 60 days when the directory or admin schedule is requested. Each occurrence has its own unique series/date/time key and independent capacity/bookings. Editing a recurring rule updates unbooked future occurrences; already-booked occurrences retain their confirmed details. Cancelled occurrences are preserved as exceptions.

## Reservations

Free reservations are stored against the signed-in user, with a unique user/session constraint. The server checks publication, deadlines, teacher booking enablement, duplicate reservations, and remaining capacity inside a database transaction. A cancellation releases the seat when the configured cutoff permits it. Paid sessions may be listed with their real configured price, but cannot be booked until a payment provider is integrated; payment status is never marked paid by this application.

My Bookings shows upcoming, completed, and cancelled reservations. The private meeting URL is excluded from public teacher/session APIs and is returned only to an authorized attendee during the configured joining window. The waiting room displays a countdown and instructions; join is enabled only while the session is in its configured window.

## Live communication and infrastructure

The existing Community uses polling for chat/presence and has no audio/video provider. Sprachcafé therefore does not offer fake in-site microphone, camera, or screen-share controls. An admin can configure a private HTTPS meeting URL from an external provider; only booked learners receive it at join time. Full in-site voice/video requires a WebRTC provider/SFU plus signaling and TURN infrastructure and credentials. No new media credentials are needed for the current external-link flow.

Paid bookings require a payment provider (for example, a server-side checkout/webhook integration), provider keys stored only in server environment variables, and verified webhook signatures before payment status can change. No provider is configured, so paid booking is deliberately disabled.

## Storage and verification

`cafe_teachers`, `cafe_series`, `cafe_sessions`, and `cafe_bookings` are created through the additive `SPRACHCAFE_DDL` initializer in `src/lib/db/index.ts`; existing user tables are reused. Production needs the same persistent Turso/libSQL database as the rest of the site. Vercel's temporary `/tmp` SQLite fallback is not persistent and is unsuitable for booking records.

Run `npm run typecheck`, `npm run lint`, `npm test -- tests/sprachcafe.test.ts`, and `npm run build`. The integration test covers teacher seeding/privacy, admin authorization, duplicate and capacity enforcement, cancellation/rebooking, paid-booking rejection, attendee-only meeting links, and idempotent timezone-aware recurrence.
