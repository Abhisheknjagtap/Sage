# Companion — An Honest Thinking Partner

Not a therapy app. Not a yes-man. A companion that reflects your patterns back at you — gently, honestly, and with genuine care.

---

## Product Vision

Most AI chat tools optimise for feeling good. Companion optimises for *being known*. It tracks recurring themes across conversations, notices when you're minimising yourself or seeking validation, and occasionally holds up a mirror — not to judge, but to reflect.

**Three core mechanics:**

1. **Honest Mirror** — after several exchanges, the AI may reframe your narrative with a more truthful observation. It's not a lecture; it's a question.
2. **Pattern memory** — across sessions, the app notices what you keep returning to (work stress, a specific relationship, a recurring self-doubt) and uses that context to ask better questions.
3. **Exit grounding** — when you end a conversation, you get one warm, grounding sentence before you go.

---

## Local Setup

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- An [Anthropic](https://console.anthropic.com) API key
- A [Resend](https://resend.com) account (for email nudges)

### Install

```bash
git clone <repo>
cd companion
npm install
```

### Environment variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=companion <noreply@yourdomain.com>

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Vercel Cron (generate a random secret)
CRON_SECRET=some-random-secret-string
```

### Database setup

Run the SQL in `lib/database.sql` against your Supabase project (SQL editor or `supabase db push`).

The schema creates:

| Table | Purpose |
|---|---|
| `profiles` | User display name, life context, communication style |
| `conversations` | One row per session, with summary + flags |
| `messages` | Every message, with tone + special message flags |
| `user_patterns` | Aggregated topics, behaviors, check-in state |
| `nudge_settings` | Per-user email nudge preferences |

Row Level Security is enabled — users can only access their own rows.

### Run locally

```bash
npm run dev
```

---

## Testing

### Unit tests (Jest)

```bash
npm test
```

Covers:

- `detectTone()` — heuristic and API-path tone classification
- `isCrisisMessage()` + `buildCrisisResponse()` — crisis detection
- `computePatterns()` + `generateCheckinQuestion()` — pattern logic with mocked Supabase + Anthropic

### End-to-end tests (Playwright)

```bash
# Install browsers (first time only)
npx playwright install

# Run tests (requires dev server or set CI=true)
npm run test:e2e
```

The full-journey spec covers: signup → onboarding → conversation → end → conversations list → settings nudge toggle.

---

## Deployment

### Vercel (recommended)

1. Push to GitHub and connect to Vercel
2. Add all environment variables in the Vercel dashboard
3. `vercel.json` configures two cron jobs:
   - `0 2 * * *` — nightly pattern computation
   - `0 * * * *` — hourly nudge emails

### Vercel Cron authentication

Both cron routes require `Authorization: Bearer $CRON_SECRET`. Vercel Cron automatically passes this when you set `CRON_SECRET` in your environment.

---

## Prompt Engineering Notes

### Main conversation (`app/api/chat/route.ts`)

The system prompt builds context from user profile (name, relationship status, primary life area, communication style) and conversation history (previous topics). Key behaviours:

- **Honest Mirror** triggers after 4+ exchanges when a pattern of self-minimisation, validation-seeking, or contradiction-deflection is detected. It reframes with a question, not a statement.
- **Crisis detection** runs synchronously before every response — if `isCrisisMessage()` returns true, the canned crisis response is returned immediately without touching the LLM.
- Tone detection (`detectTone()`) runs in parallel with the response stream and is saved to the message row for pattern analysis.

### Communication style adaptation

`inferCommunicationStyle()` in `lib/patterns.ts` uses heuristics (word count, emotional/analytical/action vocabulary ratios) to classify users as `emotional | analytical | action-oriented | reflective`. The main prompt includes the detected style so Claude adjusts its register accordingly.

### Model choices

| Use case | Model | Why |
|---|---|---|
| Main conversation | `claude-sonnet-4-6` | Best quality for nuanced emotional responses |
| Tone + crisis + summaries | `claude-haiku-4-5-20251001` | Low latency, classification-only tasks |
| Behavioral pattern extraction | `claude-haiku-4-5-20251001` | Batch, non-realtime |

### Temperature settings

| Value | Used for |
|---|---|
| 0 | Tone classification (deterministic) |
| 0.3 | Pattern extraction, summaries |
| 0.6 | Exit grounding |
| 0.7 | Check-in questions |
| 0.8 | Nudge messages |
| default | Main conversation |
