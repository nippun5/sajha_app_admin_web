# SaJHa Admin Portal — Phase 2 (frontend demo)

A responsive **React + TypeScript + Vite** admin web interface for reviewing paid business-submission requests, recording manual off-app payment confirmation, approving/declining businesses, managing published visibility, and moderating review reports.

> IMPORTANT: This is **NOT a secured or connected administration service**. It has **no admin login**, **no Spring Boot or MySQL integration**, **no payment gateway**, **no real Flutter submission feed**, and **no public publishing**. Demo data is stored in **this browser's localStorage** so you can test the interactions across page reloads. Use invented/test records only. Do **not deploy publicly** until authenticated backend administration is implemented.

## 1. Add this folder to your existing project (no new GitHub repository)

You can put this folder next to your Flutter code in the same existing `sajha_app` repository:

```text
sajha_app/
├── android/
├── ios/
├── lib/
├── pubspec.yaml
└── admin-web/                 ← copy the extracted folder here
    ├── package.json
    ├── public/
    ├── src/
    └── ...
```

This is a separate **web application** inside the same repository, not a replacement for Flutter. No Flutter files are changed. If you prefer, you may keep it in a sibling directory instead.

## 2. Preserve the original logo

From the Flutter project root, run:

```bash
cp assets/images/logo.png admin-web/public/sajha-logo.png
```

The portal uses SaJHa's real brand values: navy `#1E1B4B`, coral `#E05A3A`, periwinkle `#6B6FC5`. Without the copied logo, the UI shows a simple **S** fallback; it does not generate a replacement brand image.

## 3. Run locally on Mac

Install Node.js **20.19+ or 22.12+** (Vite 7 requirement). In your existing terminal:

```bash
cd admin-web
npm install
npm run test:logic
npm run dev
```

Open **http://localhost:5173/** in Chrome or Safari. Use **a different terminal** for Flutter if you want both running.

Check production build compilation (not safe for deployment until backend/auth exist):

```bash
npm run build
```

The build output is in `admin-web/dist/`.

## 4. Manual test walkthrough

1. **Dashboard:** See total, Pending, Approved, open review report counts.
2. **Business requests:** Search/filter Pending, Approved, Declined; open **Demo Himalayan Cafe**.
3. **Details:** Verify owner phone, description, address, opening hours and revision. Tap **Call owner** or **Send SMS** only as a native-app preview.
4. **Approval gate:** Approve must be disabled before manual payment is recorded.
5. **Record manual payment:** Confirm the checkbox, optionally add an internal reference or note, then save. **This does not charge anyone.**
6. **Approve:** The example request becomes Approved and shows under **Published businesses**.
7. **Decline:** Choose another Pending request and provide a reason (10+ characters). It moves to Declined.
8. **Suspension:** In Published businesses, suspend an Approved listing with a reason and restore it. Its approval status remains Approved.
9. **Review reports:** Dismiss one; mark another removed with a note. No actual Flutter reviews are deleted.
10. **Activity log:** Verify actions appear. Refresh the browser; changes should persist *only in this browser*.
11. **Settings:** Reset sample data and verify the original examples return.
12. **Responsive layout:** Resize browser to phone width; navigation should open from the menu button.

## 5. What is / isn't connected

| Action | This frontend demo | Real version later |
|---|---|---|
| Flutter submits business | Saves only in Flutter in-memory Profile demo store | Spring Boot `POST /api/business-requests` |
| Admin sees request | Seeded sample data in browser | Spring Boot queries same DB |
| Admin contacts owner | Phone/SMS link | Same, using real consented contacts |
| Payment | Human confirms checkbox and optional note | Human pays/contacts privately; server stores authorized verification event |
| Approval | Updates browser demo status | Server transaction creates public business record |
| Review moderation | Updates demo report state | Server checks admin role and applies moderation |
| Admin authentication | **Not implemented; do not deploy** | Real admin login, MFA, server permissions |
| Audit history | Browser-local and editable | Append-only database-backed audit log |

The payment workflow must comply with applicable Apple/Google rules for paid in-app digital placement before production; manual off-app payment alone does not guarantee exemption.

## 6. API and model contract

See [`API_CONTRACT.md`](./API_CONTRACT.md). The admin `BusinessRequest` intentionally includes Flutter Step 6B's submitted fields (`name`, `category`, `phone`, `description`, `onlineOnly`, `address`, coordinates, opening hours, revision) as an **admin read model** plus approval/payment metadata.

We kept the **three main statuses**: Pending, Approved, Declined. Suspension is a separate visibility state. Existing published businesses do not expire automatically.

Review moderation data is a separate collection, compatible conceptually with Flutter Step 6C's `BusinessReviewReport` records.

## 7. Troubleshooting

- `npm: command not found`: install Node.js then restart the terminal.
- `EADDRINUSE 5173`: another dev server is running; use `npm run dev -- --port 5174`.
- Logo shows `S`: ensure `admin-web/public/sajha-logo.png` exists.
- No Flutter requests appear: expected; there is **no shared backend** yet.
- Changes disappear on another browser/device: expected; browser demo storage is isolated.
- Demo changed unexpectedly: open **Settings → Reset demo data**.
- Production publishing? **Not yet.** The portal must not be used with real customer data until server authentication, permissions, persistence and policy review are complete.
