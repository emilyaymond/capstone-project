# GitHub Copilot / Agent Instructions — HealthVis

Quick summary

- HealthVis = React web + Expo React Native mobile app (mobile in `healthvis-mobile/`) + a small FastAPI backend (`backend/`).
- Mobile integrates directly with Apple HealthKit for comprehensive health data access; backend exposes AI-powered analysis endpoints.

How to run & test (must-do commands)

- Mobile (dev):
  - cd healthvis-mobile && npm install
  - npm start # runs `npx expo start --dev-client --tunnel -c` (tunnel useful for device testing)
  - npm run ios --device for physical iOS device (required for HealthKit)
  - For web: npm run web
- Backend (dev):
  - python -m venv .venv && source .venv/bin/activate
  - pip install -r backend/requirements.txt
  - set env vars in `backend/.env` (see Config section below)
  - uvicorn backend.main:app --reload --port 8000 (or python backend/main.py)
- Tests & lint:
  - cd healthvis-mobile && npm test # jest + jest-expo
  - npm run lint

Architecture & data flow (big picture)

- Mobile UI (Expo with `app/` routing):
  - `healthvis-mobile/contexts/HealthDataContext.tsx` is the single source for vitals, caching (AsyncStorage), HealthKit integration, analysis and chat invocations.
  - `healthvis-mobile/lib/api-client.ts` is the canonical API client (timeouts, retry logic, APIError). Use it for backend calls.
  - `healthvis-mobile/lib/healthkit-service.ts` contains the HealthKit integration logic using react-native-health library.
- Backend (FastAPI):
  - `backend/main.py` exposes: `/` (root), `/health`, and `/api` router.
  - Key API endpoints: `POST /api/chat`, `POST /api/analyze` (see `backend/api/chat.py`).
  - AI integration is in `backend/services/client.py` and controlled by `backend/config.py` (.env-backed pydantic settings).
- Accessibility flow: backend analysis -> frontend `HealthDataContext` -> triggers TTS/haptics/sonification using `announce*` utilities and hooks (`useAudio`, `useHaptics`, `useSpeech`).

Project-specific conventions & patterns

- API client conventions:
  - Consistent use of `APIError` to distinguish status/timeouts/network errors. Respect `isTimeout` and `isNetworkError` flags in UIs.
  - Timeouts use AbortController and a shared `REQUEST_TIMEOUT` constant. Use `withRetry` helper to retry transient errors.
- HealthKit integration:
  - HealthKit service uses react-native-health library to fetch comprehensive health data (vitals, activity, body measurements, nutrition, sleep, mindfulness).
  - Data is organized into categories and converted to the unified HealthMetric format.
  - Requires physical iOS device for full functionality (simulator has limited HealthKit support).
- Accessibility-first: any feature that surfaces analysis results should call the `HealthDataContext` trigger or the `announce*` utilities so it behaves consistently across audio/haptic modes.
- Tests and scripts:
  - Unit tests use `jest`/`jest-expo` and `@testing-library/react-native`.

Mobile deep-dive (important files & patterns)

- Announcements & SR: `healthvis-mobile/lib/announcer.ts` is the single API for screen reader messages. Use `announce`, `announceSuccess`, `announceError`, `announceNavigation`, and `announceModeChange` for consistent behavior; note web dispatches a `CustomEvent('accessibility-announcement')` while iOS/Android call `AccessibilityInfo.announceForAccessibility`.
- Audio / Haptics / Speech:
  - `healthvis-mobile/hooks/useAudio.ts`, `useHaptics.ts`, and `useSpeech.ts` implement audio and haptic feedback and respect `AccessibilityContext` settings (e.g., `audioEnabled`).
  - Audio uses pre-generated tones in `healthvis-mobile/assets/audio` and `expo-av` (mocked in tests via `jest.setup.js`). Sonification logic lives in `healthvis-mobile/lib/sonification.ts` (`playDataSeries`, `stop`, `getFrequencyForRange`).
- HealthKit integration:
  - `healthvis-mobile/lib/healthkit-service.ts` handles all HealthKit interactions using react-native-health.
  - Supports comprehensive health data categories: vitals, activity, body measurements, nutrition, sleep, and mindfulness.
  - Data is converted to unified HealthMetric format defined in `healthvis-mobile/types/health-metric.ts`.
- API client & timeouts:
  - `healthvis-mobile/lib/api-client.ts` uses a 2s default `REQUEST_TIMEOUT` and `withRetry` exponential backoff. Long-running operations (AI analysis) may require increasing timeouts or handling async server-side work.
- Tests & Mocks guidance:
  - `healthvis-mobile/jest.setup.js` already mocks `expo-speech`, `expo-haptics`, `expo-av`, and `@react-native-async-storage/async-storage`. When adding tests assert calls to these mocks (e.g., `expect(speech.speak).toHaveBeenCalledWith(...)`) instead of expecting platform behavior.
  - For AI-related features, mock backend endpoints (or `backend/services/client.AIClient`) to avoid network calls in unit tests and CI.
- Device testing notes:
  - Use the tunnel dev client (`npm start`) and set `EXPO_PUBLIC_API_URL` to the reachable backend address (or use ngrok). For `npm run ios --device`, ensure you have a physical iOS device connected for full HealthKit functionality.
- Troubleshooting tips:
  - React mismatch error: check `npm ls react` and `npm ls react-test-renderer` and pin `react`/`react-dom` to the same version as `react-test-renderer` (project currently uses 19.1.0). Clear `node_modules` and lockfile, then `npm ci` and `expo start -c`.
  - Icon/component errors like `Cannot read property 'default' of undefined` often indicate a missing native module or mis-import (e.g., `expo-symbols`). Reinstall the dependency and clear caches.
  - HealthKit permissions: If data is not loading, check iOS Settings → Privacy & Security → Health → HealthVis to ensure permissions are granted.

Integration points & environment notes

- Backend AI keys & service selector are env vars in `backend/.env` (Pydantic `Settings`):
  - `openai_api_key`, `ppx_api_key`, `groq_api_key`, `ai_service` (default: `perplexity`).
- Frontend -> backend URL override: `EXPO_PUBLIC_API_URL` (defaults to `http://localhost:8000`). For device testing with tunnel/ngrok, set `EXPO_PUBLIC_API_URL` to the tunnel URL.
- Mobile dev uses Expo dev client with tunnel; if using an external device you may need to install `@expo/ngrok` globally (seen in dev environment; e.g., `sudo npm install -g @expo/ngrok@latest`).

Common pitfalls / Known issues (do not repeat effort)

- React version mismatch in RN: If you see "Incompatible React versions: react and react-native-renderer must have the exact same version", check `npm ls react` and `npm ls react-test-renderer` and align versions (the project pins react 19.1.0 and react-test-renderer 19.1.0). Typical fix: pin `react`/`react-dom` to the same version as `react-test-renderer`, clear node_modules and lockfile, then `npm install` and `expo start -c`.
- HealthKit simulator limitations: HealthKit has limited functionality in iOS simulator. Use a physical device for full testing.
- Backend AI usage: tests must _not_ call real APIs; mock `backend/services/client.AIClient` or patch `ai_client` to return deterministic responses.

Where to look when changing a feature

- Frontend state/side-effects: `healthvis-mobile/contexts/HealthDataContext.tsx`
- HealthKit integration: `healthvis-mobile/lib/healthkit-service.ts`
- Health data types: `healthvis-mobile/types/health-metric.ts`, `healthvis-mobile/types/index.ts`
- Backend endpoints and AI integration: `backend/api/chat.py`, `backend/services/client.py`, `backend/config.py`
- API client behavior (timeouts/retries): `healthvis-mobile/lib/api-client.ts`
- Types: `healthvis-mobile/types/index.ts` (keep types consistent)

Examples / Quick snippets

- Backend health check:
  - GET http://localhost:8000/health
- Chat endpoint (curl):
  - curl -X POST http://localhost:8000/api/chat -H 'Content-Type: application/json' -d '{"message":"Please analyze", "data":{}}'
- Start mobile (tunnel for device):
  - cd healthvis-mobile && npm start

Expectation for AI agents

- Preserve user-facing contracts: do not change API response formats without updating `types/index.ts` and client parsing logic.
- When modifying AI prompts or models, add unit tests that assert the endpoint returns the expected structured fields (`analysis`, `chart_suggestions`, `status`).
- For any change touching health data, ensure HealthKit integration is tested on a physical iOS device.

If anything above is unclear or you want more detail (e.g., PR checklist, specific test examples, or CI recommendations), tell me which part to expand and I’ll iterate. — GitHub Copilot
