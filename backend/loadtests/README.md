# k6 tenant load tests

This folder contains load tests for the tenant journey.

## Included test

- `tenant-1000-users.js`: simulates `1000` tenant users doing:
  - `POST /api/auth/login` only when you do not provide JWTs
  - `GET /api/properties/explore`
  - repeated `POST /api/matches`
  - `GET /api/matches/tenant`
  - `POST /api/chat/start`
  - `GET /api/chat/conversations`

## Backend optimization coverage

The load test now targets the optimized tenant journey in the backend:

- match writes use canonical upserts on `{ tenantId, propertyId }`
- tenant match reads use exact `ObjectId` filters
- explore reads avoid the older mixed string/ObjectId exclusion path
- conversation reads use denormalized `landlordId` instead of property-driven landlord filtering
- chat thread bootstrap uses the same canonical match identity as match creation

Timing logs are emitted from the backend for:

- `exploreProperties`
- `createMatch`
- `getTenantMatches`
- `createMessage`
- `startThread`
- `startLandlordThread`
- `markMatchRead`
- `getConversations`

## Important auth note

Your backend rate-limits `POST /api/auth/login` to `10` requests per `60s`.

That means a real `1000`-user run should use pre-issued JWTs instead of trying to log in all users during the test from one load generator.

## Recommended run

```powershell
k6 run `
  -e K6_BASE_URL=http://localhost:3001 `
  -e K6_TENANT_TOKENS_FILE=backend/loadtests/generated/tenant-tokens.txt `
  backend/loadtests/tenant-1000-users.js
```

## Generate 1000 tenant accounts and tokens

```powershell
cd backend
npm run loadtest:prepare-tenants
```

Generated output:

- `backend/loadtests/generated/tenant-tokens.txt`
- `backend/loadtests/generated/tenant-emails.txt`
- `backend/loadtests/generated/tenant-credentials.json`

These generated files are local test artifacts and should not be committed.

Optional overrides:

```powershell
$env:LOAD_TEST_TENANT_COUNT="1000"
$env:LOAD_TEST_TENANT_PASSWORD="Victor1@seun"
$env:LOAD_TEST_TENANT_PREFIX="loadtest-tenant"
npm run loadtest:prepare-tenants
```

## Login fallback run

Use this only for small dry runs unless you remove or adjust the login throttle.

```powershell
k6 run `
  -e K6_BASE_URL=http://localhost:3001 `
  -e K6_VUS=20 `
  -e K6_DURATION=30s `
  -e K6_TENANT_EMAILS="tenant1@test.com,tenant2@test.com" `
  -e K6_TENANT_PASSWORD="Password123!" `
  backend/loadtests/tenant-1000-users.js
```

## Useful env vars

- `K6_BASE_URL`: backend origin, defaults to `http://localhost:3001`
- `K6_VUS`: concurrent tenant users, defaults to `1000`
- `K6_DURATION`: scenario duration, defaults to `1m`
- `K6_EXPLORE_LIMIT`: listings fetched per explore request, defaults to `12`
- `K6_SWIPES_PER_USER`: swipes per user iteration, defaults to `5`
- `K6_ENABLE_CHAT_START`: set to `false` to skip chat creation
- `K6_TENANT_TOKENS`: comma-separated JWTs, preferred for real load
- `K6_TENANT_TOKENS_FILE`: newline-separated token file for large runs
- `K6_TENANT_EMAILS`: comma-separated tenant emails for login fallback
- `K6_TENANT_EMAILS_FILE`: newline-separated email file for login fallback
- `K6_TENANT_PASSWORD`: shared password for all fallback emails
- `K6_TENANT_PASSWORDS`: comma-separated passwords if accounts differ
