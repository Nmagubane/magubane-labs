# Magubane Labs

**Build the minds that build the future.**

An interactive mathematics and science learning platform for South African learners in Grades 4 to 12, with an educator mode for teachers.

> sign up → email code → onboarding → baseline check → Home ("do this next") → lesson with labs → adaptive practice with hints, feedback and mistake diagnosis → timed test (tutor locked) → results with biggest opportunity → progress and exam readiness → AI tutor

## Run it (Windows, macOS or Linux)

You need **Node.js 22.13 or newer**. The current LTS from nodejs.org is fine.

```bash
npm install
copy .env.example .env        # macOS/Linux: cp .env.example .env
npm run seed:demo             # optional: a demo learner, a demo teacher and two classes
npm run dev                   # http://localhost:5174
```

Demo logins after `npm run seed:demo`:

| Who | Email | Password |
|---|---|---|
| Learner (Lerato, Grade 10, 30 days of history) | `demo@magubane.local` | `Learn-maths-daily-1` |
| Teacher (Mr Khumalo, classes 10A and 9B) | `teacher@magubane.local` | `Teach-maths-2026!` |

Class codes `DEMO10` and `DEMO9B` let a new learner join a demo class.

In development, sign-up codes, password-reset codes and weekly reports are printed in the server terminal instead of being emailed.

**The AI tutor** needs `ANTHROPIC_API_KEY` in `.env`. Without a key everything else works, and the tutor page says it isn't connected. It never pretends to be.

| Command | What it does |
|---|---|
| `npm run dev` | Client rebuilds on save (refresh the browser); server restarts on save |
| `npm test` | 74 tests: every question generator (5 levels × 250 seeds, all self-checked and KaTeX-rendered), the mastery model, lesson content, and the full loop over HTTP, including email codes, password rules, educator access rules and PDF reports |
| `npm run typecheck` | Strict TypeScript across client, server and shared code |
| `npm run build` then `npm start` | Production build and server |

## Deploy (Render)

`render.yaml` is a Render Blueprint: a Node web service in Frankfurt with a 1 GB persistent disk for the SQLite database.

1. In Render: **New → Blueprint**, then connect this GitHub repo.
2. Fill in the secrets it asks for: `INVITE_CODES` (comma-separated, e.g. `FAMILY-2026,SOWETO-PILOT`), `CONTACT_EMAIL`, `ANTHROPIC_API_KEY`, `EDUCATOR_CODES`, `EMAIL_API_KEY` and `EMAIL_FROM`.
3. Deploy. Share `https://<your-service>.onrender.com/signup?code=YOUR-CODE` with families, and `/signup/teacher` plus an educator code with teachers.

### Email (sign-up codes, password resets, weekly PDF reports)

Every new account confirms its email with a 6-digit code, so email must be connected before you open sign-ups. Either provider has a free tier:

- **Brevo**: create an account, verify a sender (Senders, Domains & Dedicated IPs → add your address or domain), then SMTP & API → API keys → generate a key. Set `EMAIL_PROVIDER=brevo`.
- **Resend**: create an account, verify your domain, create an API key. Set `EMAIL_PROVIDER=resend`.

Then set `EMAIL_API_KEY` and `EMAIL_FROM` (the verified sender) in Render. Until this is done, codes only appear in the Render logs and the verify screen says so.

### Educator mode

Teachers sign up at `/signup/teacher` with a code from `EDUCATOR_CODES`. They create classes, share a 6-character class code, assign lessons, practice and tests, see a skill-by-skill heatmap and common mistakes, present lessons on a projector, and download or email PDF reports. Every Sunday at 17:00 (South African time) guardians and teachers get a weekly PDF progress report; guardians can unsubscribe from the email itself.

Sign-up is **invite-only** in production. Under-18s must give a parent or guardian's name and email, and the parent ticks consent; both are recorded with the privacy-notice version. Learners can delete their account, and all their data, from *Your account*.

**Backups:** the database is one file at `/var/data/magubane.db`. Back it up before you rely on it.

## What's in the slice

- **55 skills, Grades 4 to 12**: Mathematics (place value to calculus), Natural Sciences & Technology for Grades 4–6 (life and living, matter, energy, Earth and space, structures), Physical Sciences and Life Sciences. Learners see their own grade band first and can look ahead.
- **55 lessons** and **47 interactive labs**, from a living-things sorting game, a two-pot bean experiment (with a fair-test checker), a sound lab with real audio and a Moon-phase explorer drawn for the Southern Hemisphere, to a discriminant explorer, savings growth chart and tangent explorer.
- **Parametric question generators**: every learner gets different numbers. Free-response algebra is checked by an exact polynomial engine, including *form* ("is it factorised?", not just "is it equal?"). Decimal commas are accepted.
- **Mistakes are data**: each generator predicts the wrong answers that common misconceptions produce. A wrong answer is diagnosed by name, with a fix tip, and recurring patterns show on Progress.
- **Mastery per skill**: an explainable rating model with forgetting and review due dates. Mastered needs evidence, not one lucky answer.
- **Assessment integrity by construction**: answers never reach the browser before you respond. In test mode there are no hints and no feedback, and the tutor is locked server-side until you submit.
- **Exam readiness**: an honest score (untested topics count as "probably not ready") and a day-by-day plan that rebuilds from current mastery every time you open it.

## Project layout

```
src/shared   the learning engine: questions, curriculum, lessons, mastery (pure TS, fully tested)
src/server   node:http + node:sqlite; auth + email codes, activities, grading, insights, tutor, classes, PDF reports
src/client   React 19, a tiny router, plain CSS design tokens
docs/ARCHITECTURE.md   decisions, data model, design language, what's not built yet
```

Runtime dependencies: `react`, `react-dom`, `katex`, `zod`. That's all.

## Before real learners use it

Read **docs/ARCHITECTURE.md §7**. In short:
- POPIA parental consent for under-18s, and an agreement with your email provider (it receives guardians' and teachers' addresses).
- A data processing agreement for the tutor's API.
- Verify the provisional CAPS mappings.
- Move to Postgres when you run more than one server.
