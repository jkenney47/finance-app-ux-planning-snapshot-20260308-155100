# AI Financial Advisor

An iOS-first mobile finance app focused on deterministic "next best step" guidance plus explainable AI.

## Active Stack

- Frontend: Expo + React Native + TypeScript + Expo Router
- UI: NativeWind utility classes + reusable primitives/components + theme tokens
- Data/Auth/Functions: Supabase
- State: Zustand

## Current Project Structure

```text
app/             # Expo Router routes and shared screen modules
assets/          # Shared app assets
components/      # Reusable UI components
docs/            # Product + architecture + engineering docs
ios/             # Native iOS project (active target)
scripts/         # Local setup and validation utilities
stores/          # Zustand stores
supabase/        # Migrations and edge functions
theme/           # Theme tokens and compatibility bridge
types/, utils/   # Shared types, domain logic, service adapters
__tests__/       # Jest tests
```

## Quick Start

```bash
npm run bootstrap
npm run start
npm run ios
```

`bootstrap` verifies Node `20.x` before installing dependencies.

## Validation

Before considering any task complete, follow `AI_RULES.md` section 5 (`npm run validate`).

## Agent-First Docs

- Docs index: `docs/README.md`
- Canonical AI rules: `AI_RULES.md`

## Environment

Create `.env.local` (preferred) or `.env` with at minimum:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Optional analytics keys:

```bash
EXPO_PUBLIC_POSTHOG_API_KEY=
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

Optional subscriptions keys:

```bash
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=
```

Generate Supabase database types:

```bash
SUPABASE_ACCESS_TOKEN=... npm run supabase:gen:types
```

If you copy `env.example`, replace every `YOUR_...` placeholder you keep, or remove those lines before running `npm run validate:env`.
