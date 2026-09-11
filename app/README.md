# ecoVolt-finder — App (Member 1)

React Native + Expo app, targeting **Android via Expo Go**.

## Setup

```bash
cp .env.example .env
# Fill in GOOGLE_MAPS_ANDROID_KEY and API_BASE_URL
```

## Running

```bash
npm install
npx expo start
# Scan the QR code with Expo Go on Android
```

## Key Decisions

- Use **`react-native-maps`** (not `expo-maps`) — works in Expo Go on Android.
- Set `USE_MOCKS=true` in `.env` until the backend is live.
- All shared types come from `../contracts/types.ts` and `../contracts/enums.ts`.
- Mock responses live in `../contracts/examples/*.json`.

## Folder Structure (after M1-C1)

```
src/
├── theme/           # Design tokens, typography, color scales
├── components/      # UI primitives + loading states
├── screens/         # Driver / manager / admin screens
├── navigation/      # Navigation stacks and tabs
├── features/        # Feature-scoped hooks + state
├── api/             # HTTP client + mock switch
└── lib/             # Utils, formatters (₹, kWh, greenness color)
```

## Chunks to implement

| Chunk | Description | Branch |
|---|---|---|
| M1-C1 | Expo bootstrap + navigation + HTTP layer | `m1/c1-bootstrap` |
| M1-C2 | Design system + UI kit + loading states | `m1/c2-design-system` |
| M1-C3 | Auth flow + session + role routing | `m1/c3-auth` |
| M1-C4 | Driver home: map + station discovery | `m1/c4-driver-map` |
| M1-C5 | Station detail: greenness + pricing + forecast | `m1/c5-station-detail` |
| M1-C6 | Route compare + true-cost card | `m1/c6-route-compare` |
| M1-C7 | Vehicle management | `m1/c7-vehicles` |
| M1-C8 | Smart-charge scheduling flow | `m1/c8-smart-charge` |
| M1-C9 | Active session screen | `m1/c9-session` |
| M1-C10 | Impact + history dashboard | `m1/c10-impact` |
| M1-C11 | Manager portal | `m1/c11-manager` |
| M1-C12 | Admin view + offline + accessibility polish | `m1/c12-admin-polish` |
