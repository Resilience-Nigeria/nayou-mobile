# Omiara mobile app (Expo)

Expo SDK 58, expo-router, TypeScript, TanStack Query. Talks to the Omiara Laravel API (JWT).

## Run
```bash
npm install
EXPO_PUBLIC_API_URL=http://<your-lan-ip>:8000/api/v1 npx expo start
```
`app.json` `extra.apiUrl` is the fallback (`10.0.2.2` = Android emulator host). Use your machine's LAN IP on a real phone.

## Push notifications
Run `eas init` once and put the project id in `app.json` → `extra.eas.projectId`. Until then push registration is skipped (the in-app Alerts inbox still works). Pushes need a physical device.

## Notes
- Chat has no realtime yet: the open conversation polls every 5 s, the matches list every 30 s.
- Payments: Paystack opens in the in-app browser; the order screen then polls with `?refresh=1` until it settles. Bank transfer shows the account details plus a "I have paid" form.
- Nothing business-related is hardcoded: costs, limits, plans, packages, radius options and age floors all come from the API.
- Screens: welcome/login/register, appeal-a-suspension, Discover (swipe, match), Matches, Chat (report/block/unmatch), Alerts, Coins (buy, history, orders), Plans, Me (profile, photos, verification, preferences, location, notifications, appeals).
- A `report` screen and `GET /states`, `GET /conversations/{id}/messages` are used: make sure the latest API overlay is applied.
- Not tested on a device or simulator in the build sandbox; only `tsc --noEmit` has been run.
