# HealthVis

An accessibility-first iOS health app. The premise is that health data shouldn't
require sight: the same dataset is delivered through four parallel channels —
visual charts, sonification, haptics, and speech — and the user picks how they
want to receive it.

## Repository layout

This repo holds two separate components that deploy independently:

```
HealthVis/
├── healthvis-mobile/   Expo / React Native app — builds to an iOS binary
└── backend/            FastAPI service — runs as a server process
```

They are deliberately siblings, not nested. `healthvis-mobile/` is the Expo
project root: Metro watches that whole tree and EAS uploads it as build context,
so the backend's Python environment does not belong inside it. More importantly,
`backend/.env` holds the OpenAI credential and must stay out of the mobile
source tree.

## How they fit together

```
Apple HealthKit
      │
      ▼
lib/healthkit-service.ts ──► contexts/HealthDataContext.tsx ──► screens
                                          │
                                          ▼
                              lib/api-client.ts
                                          │
                                    POST /api/summary
                                          ▼
                            backend ──► OpenAI ──► summary text
```

The app never calls a model provider directly and holds no API key. It posts
precomputed statistics to the backend, which owns both the credential and the
prompt wording.

## Running it

Both components are usually needed: the app works without the backend, but AI
summaries fall back to deterministic local text.

### Backend

```bash
cd backend
python3 -m venv .hvenv && source .hvenv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Run it **from inside `backend/`**. The modules use flat imports
(`from config import settings`), so `uvicorn backend.main:app` from the repo
root fails with `ModuleNotFoundError: No module named 'config'`.

`--host 0.0.0.0` matters when testing on a physical device — bound to localhost,
your phone cannot reach it.

Configuration lives in `backend/.env` (gitignored):

| Variable | Purpose |
| --- | --- |
| `AI_SERVICE` | `openai` or `perplexity` — selects the client |
| `OPENAI_API_KEY` | Used when `AI_SERVICE=openai` |
| `PPX_API_KEY` | Used when `AI_SERVICE=perplexity` |
| `MAX_FILE_SIZE` | Upload limit in bytes |
| `CORS_ORIGINS` | JSON array of allowed origins |

Never put a credential in `healthvis-mobile/.env`. Expo inlines every
`EXPO_PUBLIC_*` value into the JS bundle at build time, so anything there ships
inside the app and is extractable from any installed build.

### Mobile

```bash
cd healthvis-mobile
npm install
npm start
```

Set `EXPO_PUBLIC_API_URL` in `healthvis-mobile/.env` to a backend address your
device can reach — your machine's LAN IP, not `localhost`, when running on a
physical phone. Environment variables are read at bundle time, so restart Metro
after changing it.

HealthKit requires a **physical iOS device**. On the simulator, HealthKit
initialisation fails and the app falls back to mock data, which means the
simulator cannot verify anything in `lib/healthkit-service.ts`.

See [healthvis-mobile/README.md](healthvis-mobile/README.md) for HealthKit
permissions, device builds, and the accessibility feature set.

## Checks

```bash
cd healthvis-mobile && npm run check
```

Runs TypeScript, ESLint, and Jest together. Individually: `npm run typecheck`,
`npm run lint`, `npm test`.

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Service status and whether an AI key is configured |
| `POST /api/summary` | Health summary from precomputed stats (`metric`, `sleep`, `dashboard`, `trends`) |
| `POST /api/chat` | Conversational analysis |
| `POST /api/analyze` | Analysis plus chart suggestions |
| `POST /api/upload-data` | CSV/JSON upload and analysis |

`/api/summary` accepts statistics rather than prose, and builds prompts
server-side in `backend/services/prompts.py`. An endpoint that forwarded
arbitrary prompt text would be an open model proxy on the project's key.
