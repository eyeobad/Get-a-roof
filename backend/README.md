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
- `GET /api/users/:id/verification-status`

- `POST /api/properties/upload-image`
- `POST /api/properties`
- `PATCH /api/properties/:id`
- `GET /api/properties/explore`
- `GET /api/properties/matches/map`
- `GET /api/properties/:id`

- `POST /api/matches`
- `PATCH /api/matches/:id`

- `POST /api/chat`
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

## Notes

- OTP, identity checks, and media uploads are stubbed and return mock data.
- JWT auth is wired with role guards on protected routes.

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
