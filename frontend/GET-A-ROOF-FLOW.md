# "Get a Roof" App: High-Level Functional Logic & Data Flow

**Core Principle:** A mobile-first web app using a centralized data store and API interactions to enable real estate matchmaking between Tenants and Landlords, with a strong emphasis on user role, preferences, and verification.

## I. Data Structures (Backend Perspective)

### User Profile

- `id`
- `role` (Enum: Tenant, Landlord, Unassigned)
- `firstName`
- `lastName`
- `email`
- `phoneNumber`
- `address` (Street, City, State, Zip)
- `isVerified` (Boolean: Overall verification status)
- `verificationStatus` (Enum: Pending, Approved, Failed, None)
- `verificationDetails` (e.g., NIN, Passport ID, Utility Bill status)
- `loginCredentials` (hashed password, Google Auth token)
- `preferences` (nested object for tenant/landlord specific preferences)

### Tenant Preferences (Part of User Profile)

- `lookingFor` (Array of Enums: NonOwnerOccupied, SharedApartment, Shortlet, SelfCompound, SharedCompound)
- `employmentStatus`
- `annualEarnings` (Range/Value)
- `maritalStatus`
- `vehicles` (Enum: Yes, No, Any)
- `hasPets` (Boolean)
- `smokingHabits`
- `drinkingHabits`
- `religionPreference`
- `educationLevel`
- `socialHabits`
- `hasChildren` (Boolean)
- `maxCommuteRadius` (Miles)

### Property

- `id`
- `landlordId` (Foreign Key to User Profile)
- `images` (Array of URLs)
- `monthlyPrice`
- `address` (Street, City, State, Zip, Lat/Lng)
- `neighborhood`
- `bedCount`
- `bathCount`
- `sqFt`
- `petFriendly` (Boolean)
- `propertyType` (Enum: Apartment, House, Condo, Townhouse, SelfCompound, SharedCompound, Shortlet, NonOwnerOccupied)
- `description`
- `amenities` (Array of Enums/Strings)
- `proofOfOwnership` (Optional, URL to document)
- `status` (Enum: Draft, Listed)
- `landlordRequirements` (nested object)

#### Landlord Requirements (Part of Property)

- `budgetRange` (for tenant's budget)
- `annualIncome` (for tenant's annual income)
- `petsAllowed` (Boolean)
- `nonOwnerOccupied` (Boolean)
- `sharedApartment` (Boolean)
- `shortlet` (Boolean)
- `selfCompound` (Boolean)
- `sharedCompound` (Boolean)
- *(Any other strict tenant preferences collected in Add Property Step 4)*

### Match

- `id`
- `tenantId` (Foreign Key to User Profile)
- `propertyId` (Foreign Key to Property)
- `status` (Enum: TenantLiked, LandlordQualified, ChatInitiated, Dismissed)
- `matchScore` (Calculated based on preferences)
- `preferencesMatchPercentage`
- `apartmentPreferenceMatchPercentage`
- `timestamp`

### Message / Chat

- `id`
- `matchId` (Foreign Key to Match)
- `senderId` (Foreign Key to User Profile)
- `receiverId` (Foreign Key to User Profile)
- `content`
- `timestamp`
- `isRead` (Boolean)

## II. Functional Logic & User Flow Breakdown

### A. Initial App Load & Authentication

**Splash Screen**

- *Logic:* Display "Get a Roof" logo for 2–3 seconds.
- *Data Flow:* No API calls.
- *Transition:* Navigate to Login Screen if unauthenticated, or Home (Explore) if already signed in.

**Login Screen**

- *Logic:* Validate email/password, support forgot password, sign-up, and Google OAuth flows.
- *Data Flow:* `POST /api/auth/login`, `POST /api/auth/google`.
- *State:* Store auth token/session on success.

**Create Account Screen**

- *Logic:* Let users pick Tenant or Landlord path, storing a temporary role while guiding them through defaults.
- *Data Flow:* Prepares payload for `POST /api/users`.

### B. General User Sign Up & Verification Flow

**General Sign Up Form**

- Validates names, email, phone, password/confirmation on the frontend.
- Calls `POST /api/users`. After success, triggers `POST /api/auth/send-email-otp` and `POST /api/auth/send-phone-otp`.
- Navigates to Email Verification.

**Email Verification**

- Input for OTP with length validation.
- Calls `POST /api/auth/verify-email-otp`.
- On success, marks `User.emailVerified` and moves to Phone OTP.

**OTP (Phone) Verification**

- OTP entry with resend timer.
- Calls `POST /api/auth/verify-phone-otp`.
- On success, marks `User.phoneVerified`.
- Tenant users continue to onboarding; landlords head to Identity Verification.

**Forgot Password – Enter Email**

- Validates email format.
- Calls `POST /api/auth/request-password-reset`.
- Shows ping-back message telling users to check email.

**Reset Password**

- Validates new password strength and confirmation.
- Calls `POST /api/auth/reset-password` with the token.
- Redirects back to Login with status message.

### C. Identity & Address Verification Flow

**Identity Verification (Step 1 of 3)**

- Users choose document type (Driver’s License, Passport, NIN) and upload or enter details.
- `Passport:` `POST /api/verification/upload-passport`
- `NIN:` `POST /api/verification/submit-nin`
- Next screen: Address & Bill Verification.

**Address & Bill Verification (Step 2 of 3)**

- Validate address and upload a utility bill image.
- `POST /api/verification/upload-utility-bill`
- `PATCH /api/users/{id}` to persist address data.
- Proceed to Facial Verification.

**Facial Verification (Step 3 of 3)**

- Access camera, guide the face capture, and post the data.
- `POST /api/verification/submit-facial-scan`
- Move to Verification Pending.

**Verification Pending**

- Display status with polling on `GET /api/users/{id}/verification-status`.
- Auto-route to Approved/Failed once backend responds.
- Provide a “Return to Home” escape if needed.

**Verification Outcomes**

- *Approved:* Celebrate, set `User.isVerified = true`, patch if necessary, and let the user continue.
- *Failed:* Show failure reason, offer “Retry” (back to Identity Verification) and “Contact Support”.

### D. Tenant Onboarding (Post-Verification / Sign-up)

**Step 1 – Looking For**

- Collect initial preferences.
- `PATCH /api/users/{id}/preferences` per step.
- Move to “More About You”.

**Step 2 – More About You**

- Collect additional demographic info and earnings sliders.
- `PATCH /api/users/{id}/preferences`.
- Continue to review.

**Step 5 – Review**

- Show all collected preferences.
- Allow edits.
- `PATCH /api/users/{id}/preferences` to finalize.
- Redirect to Tenant Home (Explore).

### E. Core Tenant Features

**Home (Explore) – Card Stack**

- Fetch properties via `GET /api/properties/explore` (filtered by geolocation and preference match).
- Use swipe or buttons: “Interested” posts to `POST /api/matches`, “Pass” does same with `tenantLiked=false`.
- Filters update query params and re-fetch.

**Property Details**

- `GET /api/properties/{id}` for full data.
- Save to favorites via `POST /api/users/{id}/saved-properties`.
- Contact landlord (opens chat – `POST /api/chat`).
- Map view leverages property coordinates.

**Map View**

- `GET /api/properties/matches/map` returns matched properties with `lat/lng`.
- Pin interactions show quick details and a “View Home Details” CTA.

**Messages List**

- Client fetches `GET /api/chat/conversations` to show active threads and unread counts.

**Tenant Profile & Settings**

- `GET /api/users/{id}` retrieves the profile.
- `PATCH /api/users/{id}` updates settings/preferences.
- Role switching (if permitted) reroutes to appropriate dashboard.

### F. Landlord Features

**Property Dashboard**

- `GET /api/landlord/{id}/properties` returns drafts/listed sites.
- Each property requests `GET /api/landlord/{id}/properties/{propertyId}/new-matches-count`.
- “Edit” goes into the Add Property flow pre-filled; “Add Property” goes to photo uploads.

**Landlord Matches – Property List**

- `GET /api/landlord/{id}/properties-with-matches` to see matches per property.
- Selecting a property opens the per-property match list.

**Landlord Matches – Property Matches**

- `GET /api/landlord/{id}/properties/{propertyId}/matches` provides match details.
- “View Profile” shows tenant info.
- “Chat” triggers `POST /api/chat`.
- “Dismiss” updates `PATCH /api/matches/{id}`.

**Add Property Flow (5 Steps)**

1. **Upload Photos:** `POST /api/properties/upload-image` for multi-image uploads; stage data in draft state.
2. **Description & Price:** Collect `monthlyPrice`, address, type, description, optional `proofOfOwnership`.
3. **Set Requirements:** Capture budget, `annualIncome`, pet policy, and toggles (nonOwnerOccupied, sharedApartment, shortlet, selfCompound, sharedCompound).
4. **Tenant Preferences:** Set landlord’s ideal tenant attributes (employment status, marital status, vehicles, etc.).
5. **Review & Publish:** Summarize, edit per-step if needed, and `POST /api/properties` or `PATCH /api/properties/{id}` with `status=Listed`.

## III. Key Cross-Cutting Concerns

- **State Management:** Use centralized systems (Redux, Context, Zustand) to manage auth, preferences, and match state.
- **API Interactions:** Communicate with RESTful or GraphQL endpoints for every data change.
- **Authentication & Authorization:** Secure actions via JWT/session tokens, enforcing role-based permissions.
- **Filtering & Matching Engine:** Backend handles geolocation (max commute radius), compatibility comparisons, and match scoring.
- **Image Handling:** Secure storage (AWS S3, Google Cloud Storage) and CDN-backed delivery.
- **Notifications:** Push for new chats, matches, and verification updates.
- **Error Handling:** Surface clear errors for API failures and invalid inputs.
- **Loading States:** Use spinners/skeletons while the app waits for network responses.

This breakdown captures the data models, API surface, and UX flows needed to bring the “Get a Roof” experience to life across tenant and landlord journeys.
