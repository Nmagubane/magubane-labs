# Magubane Labs

**Build the minds that build the future.**

An interactive mathematics and science learning platform. This is the first vertical slice: the complete learning loop, working end to end.

> sign up → onboarding → baseline check → Home ("do this next") → lesson with labs → adaptive practice with hints, feedback and mistake diagnosis → timed test (tutor locked) → results with biggest opportunity → progress and exam readiness → AI tutor

## Run it (Windows, macOS or Linux)

You need **Node.js 22.13 or newer**. The current LTS from nodejs.org is fine.

```bash
npm install
copy .env.example .env        # macOS/Linux: cp .env.example .env
npm run seed:demo             # optional: a demo learner with 30 days of history
npm run dev                   # http://localhost:5174
```

The demo login is `demo@magubane.local` / `learn-maths-daily`. You can also create your own account and go through onboarding.

**The AI tutor** needs `ANTHROPIC_API_KEY` in `.env`. Without a key everything else works, and the tutor page says it isn't connected. It never pretends to be.

| Command | What it does |
|---|---|
| `npm run dev` | Client rebuilds on save (refresh the browser); server restarts on save |
| `npm test` | 39 tests: every question generator (5 levels × 250 seeds, all self-checked and KaTeX-rendered), the mastery model, lesson content, and the full learning loop over HTTP, including security and the pilot consent rules |
| `npm run typecheck` | Strict TypeScript across client, server and shared code |
| `npm run build` then `npm start` | Production build and server |

## Deploy (Render)

`render.yaml` is a Render Blueprint: a Node web service in Frankfurt with a 1 GB persistent disk for the SQLite database.

1. In Render: **New → Blueprint**, then connect this GitHub repo.
2. Fill in the secrets it asks for: `INVITE_CODES` (comma-separated, e.g. `FAMILY-2026,SOWETO-PILOT`), `CONTACT_EMAIL` and `ANTHROPIC_API_KEY`.
3. Deploy. Share `https://<your-service>.onrender.com/signup?code=YOUR-CODE` with the families in the pilot.

Sign-up is **invite-only** in production. Under-18s must give a parent or guardian's name and email, and the parent ticks consent; both are recorded with the privacy-notice version. Learners can delete their account, and all their data, from *Your account*.

**Backups:** the database is one file at `/var/data/magubane.db`. Back it up before you rely on it.

## What's in the slice

- **21 skills** across Mathematics (number, fractions, algebra, equations, functions), Physical Sciences (mechanics, circuits, atoms, moles, balancing) and Life Sciences (cells, genetics). The focus is Grades 7–10, the years that decide Maths vs Maths Literacy.
- **21 lessons** and **14 interactive labs**: equation balance (working written like an exercise book), number line, fraction bars, area model, draggable gradient, line explorer, parabola roots, force cart, projectile lab (predict first), circuit lab, atom builder, equation balancing, cell explorer and Punnett square.
- **Parametric question generators**: every learner gets different numbers. Free-response algebra is checked by an exact polynomial engine, including *form* ("is it factorised?", not just "is it equal?"). Decimal commas are accepted.
- **Mistakes are data**: each generator predicts the wrong answers that common misconceptions produce. A wrong answer is diagnosed by name, with a fix tip, and recurring patterns show on Progress.
- **Mastery per skill**: an explainable rating model with forgetting and review due dates. Mastered needs evidence, not one lucky answer.
- **Assessment integrity by construction**: answers never reach the browser before you respond. In test mode there are no hints and no feedback, and the tutor is locked server-side until you submit.
- **Exam readiness**: an honest score (untested topics count as "probably not ready") and a day-by-day plan that rebuilds from current mastery every time you open it.

## Project layout

```
src/shared   the learning engine: questions, curriculum, lessons, mastery (pure TS, fully tested)
src/server   node:http + node:sqlite; auth, activities, grading, insights, tutor
src/client   React 19, a tiny router, plain CSS design tokens
docs/ARCHITECTURE.md   decisions, data model, design language, what's not built yet
```

Runtime dependencies: `react`, `react-dom`, `katex`, `zod`. That's all.

## Before real learners use it

Read **docs/ARCHITECTURE.md §7**. In short:
- POPIA parental consent for under-18s.
- A data processing agreement for the tutor's API.
- Verify the provisional CAPS mappings.
- Move to Postgres when you run more than one server.
