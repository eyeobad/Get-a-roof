# Get a Roof Backend

NestJS + MongoDB (Mongoose) API for the Get a Roof app. The API follows the flow in `frontend/GET-A-ROOF-FLOW.md` with stubbed verification and media upload endpoints.

## Getting started

1) Create an env file based on `.env.example`.
2) Install dependencies and start the dev server.

```bash
npm install
npm run start:dev
```

Default port: `3001`

## Key endpoints

- `POST /api/auth/login`
- `POST /api/auth/google`
- `POST /api/auth/send-email-otp`
- `POST /api/auth/send-phone-otp`
- `POST /api/auth/verify-email-otp`
- `POST /api/auth/verify-phone-otp`
- `POST /api/auth/request-password-reset`
- `POST /api/auth/reset-password`

- `POST /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/:id`
- `PATCH /api/users/:id/preferences`
- `POST /api/users/:id/saved-properties`
- `GET /api/users/:id/saved-properties`
- `DELETE /api/users/:id/saved-properties/:propertyId`
- `GET /api/users/:id/verification-status`

- `POST /api/properties/upload-image`
- `POST /api/properties/upload-proof`
- `POST /api/properties`
- `PATCH /api/properties/:id`
- `GET /api/properties/explore`
- `GET /api/properties/matches/map`
- `GET /api/properties/:id`

- `POST /api/matches`
- `GET /api/matches/tenant`
- `PATCH /api/matches/:id`

- `POST /api/chat`
- `POST /api/chat/start`
- `POST /api/chat/start-landlord`
- `GET /api/chat/conversations?limit=...&offset=...`
- `GET /api/chat/messages?matchId=...&limit=...&before=...`
- `PATCH /api/chat/mark-read`

- `POST /api/verification/upload-passport`
- `POST /api/verification/submit-nin`
- `POST /api/verification/upload-utility-bill`
- `POST /api/verification/submit-facial-scan`

- `GET /api/landlord/:id/properties`
- `GET /api/landlord/:id/properties/:propertyId/new-matches-count`
- `GET /api/landlord/:id/properties-with-matches`
- `GET /api/landlord/:id/properties/:propertyId/matches`
- `PATCH /api/landlord/:id/properties/:propertyId/mark-seen`
- `GET /api/landlord/:id/tenants/:tenantId`

## Notes

- OTP, identity checks, and media uploads are stubbed and return mock data.
- JWT auth is wired with role guards on protected routes.
- Landlord list endpoints accept `q`, `status`, and `sort` (`priceAsc`, `priceDesc`, `matchesDesc`, `matchesAsc`, `newDesc`, `newAsc`).
- Landlord requirements accept numeric `budgetRange` and `annualIncome` values (converted to max/min ranges).

## Performance Implementation

The tenant swipe, match, and chat flow has been optimized for lower query overhead in the hottest endpoints:

- `POST /api/matches`
  Uses an atomic upsert on the canonical `{ tenantId, propertyId }` pair instead of duplicate-scan cleanup before every write.
- `GET /api/matches/tenant`
  Reads active matches using exact `ObjectId` filters and simpler landlord joins.
- `GET /api/properties/explore`
  Uses lean reads, explicit sorting, direct tenant preference lookup, and cheaper match-property exclusion.
- `GET /api/chat/conversations`
  Filters on denormalized `landlordId` / `tenantId` before joins and uses direct lookups instead of `$expr/$toString` joins.
- `POST /api/chat/start`
  Uses the same canonical match identity strategy as the match write path and avoids legacy string/ObjectId dual queries.

Supporting changes:

- Added lightweight timing instrumentation in [src/common/utils/perf.utils.ts](./src/common/utils/perf.utils.ts).
- Added match indexes for conversation ordering and tenant/landlord chat reads.
- Added property indexes for common explore filters.

These changes reduce avoidable query work, but latency will still depend heavily on the deployment setup. Running against free-tier Atlas/Render without Redis enabled will still produce slow p95/p99 timings under load.

## Realtime chat

Socket.IO gateway is available (JWT required). Provide a `token` in the handshake auth:

```js
const socket = io("http://localhost:3001", {
  auth: { token: "JWT_TOKEN" },
});

socket.emit("join", { matchId });
socket.emit("sendMessage", {
  matchId,
  receiverId,
  content,
});
socket.emit("markRead", { matchId });
```
