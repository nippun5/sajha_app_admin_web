# SaJHa Admin Portal – proposed backend contract (NOT IMPLEMENTED)

## Principles

This dashboard is a **browser-only demonstration**. It does not receive Flutter requests, charge customers, or publish records to the mobile application. Payment confirmation is a **manual admin attestation**, not proof that a bank or provider processed a payment. All sample names, numbers, and review texts are fictional.

Keep `BusinessSubmission` (Flutter owner request payload), `AdminBusinessRequest` (admin metadata), and `BusinessModel` (public directory view) separate. Do **not** copy the prototype's browser `localStorage` approach into production.

## Proposed server-owned fields

- `id`, `ownerId`, `status: pending | approved | declined`, `revision`, timestamps
- `reviewedBy`, `reviewedAt`, `declineReason`
- `visibility: active | suspended`, `suspensionReason` (separate from status)
- `paymentVerification: { confirmed, verifiedBy, checkedAt, reference?, note? }`
- media object references and access-controlled image URLs
- append-only audit events, including previous and next values

Server alone determines `ownerId`, `reviewedBy`, payment verification, approval, publication, and moderation. Flutter clients may **never** set these fields authoritatively.

## Suggested HTTP endpoints

All below require **server-enforced** admin roles; never rely on hiding buttons in React.

| Method | Endpoint | Scope |
|---|---|---|
| GET | `/api/admin/business-requests?status=&q=&page=` | Paginated request queue |
| GET | `/api/admin/business-requests/{id}` | Full submission, media, owner contact |
| POST | `/api/admin/business-requests/{id}/payment-verification` | Log manual confirmation; admin identity from session |
| DELETE | `/api/admin/business-requests/{id}/payment-verification` | Revoke an incorrect Pending verification with audit reason |
| POST | `/api/admin/business-requests/{id}/approve` | Require current Pending + verified payment; transactionally publish |
| POST | `/api/admin/business-requests/{id}/decline` | Pending → Declined; requires reason |
| POST | `/api/admin/businesses/{id}/suspend` | Mark approved business invisible, record reason |
| POST | `/api/admin/businesses/{id}/restore` | Restore suspended approved listing |
| GET | `/api/admin/review-reports?status=&page=` | Moderation queue |
| POST | `/api/admin/review-reports/{id}/resolve` | Dismiss or remove review with audit log |
| GET | `/api/admin/audit-events?page=` | Server-generated immutable activity history |
| GET | `/api/admin/me` | Authenticated admin identity and roles |

Flutter owner-side endpoints, already planned in Step 6B:

- `POST /api/business-requests` – authenticated and verified owner; multipart banner upload
- `GET /api/my/business-requests` – **only own** requests
- `PATCH /api/my/business-requests/{id}/resubmit` – owner-only; Declined → Pending, revision increment and payment confirmation reset
- `GET /api/businesses` – only Approved AND active
- `GET /api/businesses/{id}` – only Approved AND active (or controlled owner/admin view)

## Matching request payload

```json
{
  "name": "Example Cafe",
  "category": "Restaurant & cafe",
  "phone": "+1-202-555-0141",
  "website": "",
  "description": "A sample community cafe.",
  "onlineOnly": false,
  "address": "A confirmed address",
  "latitude": 0,
  "longitude": 0,
  "placeId": null,
  "city": "Example City",
  "state": "Example State",
  "countryCode": "US",
  "openingHours": { "Monday": "09:00 – 17:00" },
  "openingHoursStructured": { "Monday": { "mode": "open", "opens": "09:00", "closes": "17:00", "closesNextDay": false } }
}
```

In production, all seven days must be included. Banner bytes are **not** embedded in JSON; upload separately to authorized object storage.

## Server-side workflow requirements

1. Use one database transaction for approving a request and making it eligible for publication. A race or double-click must not cause duplicate business records.
2. Check expected current status, review revision/version, actor permissions, and payment verification in every transition. Use optimistic locking or row-level locks.
3. Each paid publication must have an accountable manual payment verification record and audit event. Payment/approval status must not be writable by normal owners.
4. Approved listings stay available indefinitely unless suspended or otherwise moderated; `status` does not change on suspension.
5. Decline reasons shown to owners must not contain private bank, personal or sensitive administrator information.
6. Reviews: one per authenticated user/business, no self-review, reporting idempotent per reporter/review; reviewer identities server-owned.
7. Do not accept `ownerId`, `authorId`, `reviewedBy` or `paymentVerified` from untrusted client submissions.
8. Admin accounts require MFA, robust authorization, rate limiting, CSRF protections as appropriate, secure sessions, and restricted CORS. Prefer secure `HttpOnly` cookies where applicable; **never store session tokens in localStorage**.
9. Payment-policy review is still required before charging for digital directory placement through app-distributed workflows.

## Alignment limitations

The existing Flutter Step 6B request snapshot stores images as **in-memory bytes**; the admin web prototype has no actual banner image upload. Implement media references on the backend and resolve signed/read-authorized images in the admin UI.

The existing Flutter Step 6C mock reports have fields `businessId`, `reviewId`, `reporterId`, `reason`, and `createdAt`. The admin prototype adds a synthetic summary (`businessName`, `reviewText`, `reviewer`, `stars`) and moderation fields so its UI can be tested. In production retrieve these via a backend read model, not trusting submitted text summaries.
