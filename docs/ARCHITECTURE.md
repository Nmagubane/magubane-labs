# Bonisa — architecture & decisions

Bonisa is the learning product of Magubane Labs. The product is called Bonisa everywhere a learner, parent or teacher sees it. Magubane Labs stays as the company: it is named on the privacy notice as the party responsible for learner data, in the PDF producer field, and as the issuer of educator codes.

Short, opinionated, and kept current. If the code and this file disagree, fix one of them.

## 1. Who the MVP is for

**Grades 1–3 (Junior, Foundation Phase)** and **Grades 4–12**. Junior is the same app, server and engine with its own child-sized experience; see §8.

**Grades 4–12, South Africa (CAPS) first.** The decision between Mathematics and Mathematical Literacy happens at the end of Grade 9, but the confidence that drives it is built (or lost) from Grade 4. Content runs from place value and Natural Sciences and Technology (Grades 4–6) through Grade 7–9 algebra and Natural Sciences to Grade 10–12 calculus, finance, Physical Sciences and Life Sciences. Subjects follow CAPS (§9); `docs/CAPS-COVERAGE.md` lists what is covered and what is not. Each learner works in a grade band (`skillsForLearner`: grade − 4 to grade + 1); Learn shows that band; higher grades sit behind a separate **Look ahead** door (§9).

Natural Sciences (Grades 4–9) is mostly concept checks: its question generators draw on curated fact pools (the test suite accepts at least 3 distinct prompts per level for Natural Sciences, 10 for everything else). The labs carry the engagement: sorting, growing, building and testing, with feedback in words.

## 2. The learning loop (the product)

```
sign up → onboarding (grade, curriculum, subjects, goals, minutes/day)
       → baseline check (10 questions, no feedback, "I haven't learnt this" allowed)
       → Home: one priority + why
       → Learn (lesson: idea → interactive → worked example → checks)
       → Practice (adaptive, hints, feedback, mistake diagnosis, tutor)
       → Test (assessment mode: no hints, tutor locked server-side, timed)
       → Results (per-topic, per-skill, mistakes, confidence, biggest opportunity)
       → Progress / Exam readiness → back to Home
```

## 3. Information architecture

| Nav        | Purpose                                                    |
|------------|------------------------------------------------------------|
| Home       | "What should I do right now?" One priority, why, and alternatives |
| Learn      | Subject → topic → skill catalogue with mastery; lessons     |
| Practice   | Targeted adaptive practice (weak areas or a chosen skill)  |
| Tests      | Start an assessment; past results                          |
| Tutor      | Conversations; context-aware when opened from a question   |
| Progress   | Mastery map, 30-day trend, recurring mistakes, exam readiness |

Mobile: bottom bar (Home, Learn, Practice, Tests, Tutor). Progress lives in the top bar. Desktop: left rail.

"Explore" (a sandbox of simulations) was deliberately **not** built: the simulations live inside the lessons where they teach something. We can add a gallery later.

## 4. Architecture

```
src/shared   pure TypeScript, no I/O — the learning engine
  questions/  seeded RNG, rationals, expression parser + polynomial algebra,
              answer checking, generators (one per skill), mistake taxonomy
  curriculum/ subjects → topics → skills, prerequisites, curriculum mappings (data)
  content/    lessons as data (blocks), never hard-coded into components
  mastery/    rating model, recommender, exam readiness + plan
src/server   node:http + node:sqlite (no framework, no ORM)
src/client   React 19, tiny router, plain CSS with design tokens
```

**Why TypeScript end to end:** the client, the server and the content all share one set of types. The grading logic exists once, on the server. **Why so few dependencies:** react, react-dom, katex and zod at runtime; esbuild, tsx and typescript for development. That's less to audit for a product children will use.

### Two addresses, one server (`src/server/hosts.ts`)
- `PUBLIC_URL` (learn.magubanelabs.co.za) serves Bonisa. `SITE_HOST` (magubanelabs.co.za) serves the company site from `site/`. Without `SITE_HOST`, every address serves Bonisa, as before.
- A page path on the site address that isn't a site file is an old Bonisa link. It is redirected to the app address. If the browser still has Bonisa's session or Junior device cookie for the old address, they go through a one-time handoff (`/api/handoff`, token kept in memory for two minutes, cookies never in a URL), so no one is signed out and set-up Junior devices keep working.
- The API answers on both addresses, so tabs already open on the old address and links in emails already sent keep working.
- `www.` redirects to the bare site address. The site's "Sign in to Bonisa" link is `/learn`, which goes through the same handoff.
- The handoff store is in memory, like the rate limiters. With more than one server instance it must move to the database.

### Integrity by construction
- Questions come from **parametric generators** with server-side random seeds. Every learner sees different numbers.
- The client never receives an answer before it responds. In assessment mode it receives none until the test is submitted.
- Hints are issued and counted by the server. Each hint reduces the credit for a correct answer.
- While a test is in progress, the tutor endpoints return `423 assessment_in_progress`.
- Questions are **not** generated by the LLM. Generated maths must be correct, so the tutor explains and the generators produce questions.

### Mastery model
Each learner has a rating θ per skill. Each question has a difficulty level from 1 to 5, mapped to b ∈ {-1.5 … 1.5}. The probability of a correct answer is P = σ(θ − b), and the update is θ += K·(score − P). K starts at 0.9 and shrinks as evidence grows. Hints cut the credit by 25% each. Test answers count 15% more than practice answers.
- `mastery% = σ(1.5·(θ − 0.5))`. You need to be reliably right at level 4–5 to reach "Mastered", and the band also requires at least 8 answers.
- Forgetting: effective mastery decays with days since last practice. Stability grows with evidence and mastery. "Review due" fires when retention drops below 85%.
- Practice difficulty targets P ≈ 0.7 (desirable difficulty).
- Wrong answers are matched against **predicted misconception answers** that each generator ships with. "Mistakes are data": every one has a code, a label and a fix tip.

### Exam readiness
`readiness = mean over exam skills of (mastery × confidence + 0.3 × (1 − confidence))`. Confidence is `min(1, evidence / 8)`: an unassessed skill counts as "probably not ready", never as 0 or 100. The study plan is rebuilt from current mastery every time it's viewed, so it adapts automatically.

### Data model (SQLite, see `src/server/db.ts`)
`users`, `sessions` (hashed tokens), `learner_profiles`, `skill_states` (θ, evidence, last practised), `activities` (lesson/practice/test/baseline; mode learning|assessment), `question_instances` (render payload + secret answer + misconceptions), `responses` (score, hints, time, confidence, mistake code, θ before/after), `mastery_snapshots` (daily, for trends), `lesson_progress`, `exams`, `tutor_conversations`, `tutor_messages`, `email_codes` (HMAC-hashed 6-digit codes: 10-minute expiry, 5 attempts), `email_log` (one weekly report per recipient per period), `classes`, `class_members`, `assignments` (`activities.assignment_id` links work to an assignment).

**Educator mode.** Teachers (`users.role = 'teacher'`, sign-up gated by `EDUCATOR_CODES`) own classes; learners join with a class code. `canAccessLearner(viewer, learnerId)` in `src/server/auth.ts` is the single access rule: the learner themself, or a verified teacher of an active class the learner belongs to. Every teacher read of learner data goes through it. An assignment counts as done when the learner completes it through the assignment, or completes the same kind of work on that skill after it was set.

**Email and reports.** `src/server/mailer.ts` sends through Brevo or Resend over HTTPS, or logs to the console when no provider is set. Reports are PDFs drawn by a small hand-written writer (`src/server/pdf.ts`, standard Helvetica, no dependency). `startReportScheduler` checks every 15 minutes and sends weekly reports at `REPORT_DAY`/`REPORT_HOUR` South African time; guardians unsubscribe through an HMAC-signed link.

## 5. Design language — "study desk"

Grounded in what a learner actually works with: graph paper, a blue pen, a highlighter, a marker's tick and cross.

| Token        | Hex       | Meaning |
|--------------|-----------|---------|
| desk         | `#ECEFEA` | page background (cool, slightly green, like exam-pad graph paper) |
| paper        | `#FFFFFF` | sheets you read and work on |
| ink          | `#1A1D21` | text, primary buttons |
| pen          | `#2347D6` | **things you manipulate and your own input**: inputs, drag handles, sliders, focus |
| highlighter  | `#FFE14D` | **focus**: today's priority, the biggest opportunity |
| tick         | `#18804A` | correct, mastered |
| red pen      | `#C9302C` | incorrect, only ever with a ✗ and words |

Mastery ramp: grey (not started) → pen tints (learning, developing, proficient) → tick green (mastered). Weakness is **never** red; red is only for a specific wrong answer.

**Type:** Instrument Sans (400/700, tabular figures) for everything; KaTeX for maths. The contrast between UI type and mathematical type is deliberate: maths is set like maths. No monospace labels, no all-caps eyebrows.

**The one bold thing:** the mathematics itself, set large on graph paper. Every skill has a signature expression (`x² + 5x + 6 = 0`, `F = ma`, `n = m/M`). Home leads with the priority skill's expression, not an illustration. Graph paper appears **only** where work happens: the priority panel, lesson labs, question workspaces.

**Shape:** sheets 12px radius with a 1px rule and no shadow; controls 6px; chips 4px. Shadows only on things that float (menus, toasts). Motion only when it answers an action or shows cause and effect (sim trajectories, equation steps), and `prefers-reduced-motion` is respected.

### Phone rules (from the October 2026 mobile audit)
Phones from 320 px wide are the main target. Most of the overlaps came from four CSS habits:
- **Grid columns:** always `minmax(0, 1fr)` or `minmax(min(Npx, 100%), 1fr)`, never `1fr` or `minmax(Npx, 1fr)` on their own. Content wider than the screen makes a mobile browser zoom the whole page out, and everything looks squashed together.
- **Flex rows that should wrap:** give the main part a real basis (`flex: 1 1 9rem`), not `flex: 1`, which never wraps.
- **Form fields and selects:** `width: 100%; min-width: 0`. A select is as wide as its longest option.
- **Buttons:** labels wrap below 560 px.

Junior adds its own rules:
- A question, its answer and the Check bar fit on one phone screen, with a 5-column number pad and stacked feedback.
- Tens and ones stay side by side, because left-to-right place value is the lesson.
- Phones held sideways get compact bars.

The audit checks every screen, every lesson (86 at the last count) and every Junior question type. It runs at 320, 360, 390 and 412 px and in landscape, in light and dark mode. It flags overlaps, page overflow measured against the phone's real width, labels wider than their buttons, and content hidden under fixed bars.

### Review against the generic defaults
- The first draft used a warm cream background with a serif display. That is the commonest generated look, so it became the cool desk green with a single sans.
- The first draft gave links and accents an "AI blue" with no meaning. Pen blue is now reserved for learner-manipulable things and input. Primary buttons are ink.
- Cards everywhere was replaced by sheets plus typography. Lists are lists, not card grids.

## 6. Not built yet (on purpose)
- A guardian dashboard for **Grade 4–12** learners. Their guardians get weekly PDF reports by email. Parent accounts exist, but only for the Grade 1–3 children they create (§8).
- School-level admin (many teachers, one school) and sponsor/impact dashboards.
- Diagram labelling. Supported today: numeric, exact fraction, expression with a form check (expanded/factorised), equation (any equivalent rearrangement), coordinate pair, root sets, coefficients and multiple choice. Junior adds pick-many, ordering, sorting into groups, building with counters, ten-frames, base-10 blocks and coins, clock setting and spelling with letter tiles. A number-line input exists in the client but no generator uses it yet.
- Image questions to the tutor, and oral explanation assessments.
- Career pathways ("I want to be an engineer").
- Content authoring UI. Content is typed data in `src/shared/content` and is ready to move into the DB.

## 7. Before real children use it
- **POPIA:** under-18s need consent from a competent person (a parent). That means a parental consent flow, a privacy notice, a retention policy and a choice of hosting region.
- Guardian and teacher email addresses go to the email provider (Brevo or Resend). Sign a data processing agreement with them too.
- The tutor sends learner messages to the Anthropic API. It sends grade and skill context only, never names or emails. You need a data processing agreement and a policy for what gets logged.
- Curriculum mappings in `src/shared/curriculum/catalogue.ts` now use CAPS topic names and grades, and Grades 7–9 Natural Sciences is audited topic by topic (`docs/CAPS-COVERAGE.md`). The other subjects still need that audit and a teacher review before claiming alignment.
- Move from SQLite to Postgres when you deploy more than one server instance.

## 8. Junior: Grades 1–3 (Foundation Phase)

**Same app, a separate experience.** Children have their own accounts, routes (`/junior/*`), screens and CSS (`src/client/features/junior`, `styles/junior.css`). They share the engine: generators, server-side grading, misconception codes and the mastery model. A Grade 1 child never sees the Grade 4–12 shell, and a Grade 10 learner never sees Junior.

**Curriculum.** `src/shared/curriculum/foundation.ts` defines 112 skills, written as `fp-<key>-g<grade>`. Each is a CAPS topic at one grade, with 5 levels inside that grade's range.

| Subject | G1 | G2 | G3 |
|---|---|---|---|
| Mathematics | 17 | 17 | 17 |
| Home Language (English pack) | 8 | 8 | 8 |
| English First Additional Language | 2 | 4 | 4 |
| Life Skills (Beginning Knowledge, Personal & Social Well-being) | 9 | 9 | 9 |

Physical Education, Creative Arts and the sensitive Personal & Social Well-being topics are **adult-led cards**, not screen questions (`src/shared/junior/cards.ts`: 19 Move/Make/Talk cards, including "My body belongs to me"). Adults tick "We did this", which is stored in `card_log`. Skills have `phase: 'foundation'` and no lessons: "Watch first" plays a worked example instead. CAPS mappings are provisional, as in §7.

**How a child learns.** A child signs in, sees one tray per subject with one suggestion each, and plays a set of 5 questions. Every prompt has a `say` field that is read aloud. A child can press **Help me** (a hint) or **Watch first** (a worked example), and gets feedback with the right answer shown in place. The recommender (`src/shared/junior/recommend.ts`) works per subject: catch-up, then review due, then continue, then the next new skill in curriculum order, then practise. It never suggests the same skill three times running. There are no points, streaks or stars. The done screen shows which answers were right first time.

**Try one like it.** After a wrong first try, the feedback button offers "Try one like it": `POST /api/activities/:id/next { retry: true }` makes a new question with the same skill and difficulty, with `question_instances.retry_of` pointing at the miss, and grows the set by one. Rules, enforced on the server: practice sets only, only straight after a wrong answer, never a retry of a retry, at most `MAX_JUNIOR_RETRIES` (3) per set. A retry counts like an answer with one hint, so it earns less credit than a clean first try. Every adult-facing "right first time" number (child page, class flags, PDF report) excludes retries. The done screen shows a dashed tick for "fixed on a second try".

**"I can…".** When a Foundation Phase skill first reaches Proficient (mastery ≥ 70 with at least 6 answers), the child earns one statement in their own words, such as "I can find the pairs of numbers that make 10." Statements live in `packs/en/ican.ts` (one per skill and grade, describing what the middle levels ask, not the hardest edge) and are said back as "You can … now!". Earned once per skill (`junior_ican`). The child sees it on the done screen with a short chime, under "Things I can do" on home and on `/play/ican`. Adults see "What {name} can do" on the child page, and the weekly PDF lists the new ones. This is a record of learning, not a collection: no counts to chase, no locked slots.

**Moving up to Grade 4.** On a Grade 3 child's page, the managing parent or teacher can give the child their own login (`POST /api/children/:id/move-up`, `server/moveup.ts`). The adult chooses an email and password with the child (the normal password rules) and confirms consent. The account switches to `login_kind = 'email'` with an unverified email, so the first login sends a code. The picture code is wiped, sessions end, Foundation Phase class memberships are removed, and the profile is cleared so the full app welcomes them into Grade 4 (grade pre-selected, then subjects, goals and the starting-point check). Learning history, "I can…" statements, the guardianship and the weekly report stay. The account remains a minor's. `users.moved_up_at` records the move: the family page shows "Moved up to Grade 4" with the login email and the report link. When a teacher does it, the guardian is emailed. Deleting the parent's account no longer deletes a child who has moved up, because that child now has their own login.

**Generators** live in `src/shared/junior/gen/*`, with word lists in `reading/en*.ts` (CVC words, digraphs, blends, sight words, rhyme families, 12 original stories) and per-language packs in `packs/<lang>`. Questions carry a `scene` for counters, ten-frames, base-10 blocks, coins, clocks, rulers, balances, pictographs and pattern strips. Phonics questions are anchored on spoken picture words, because device text-to-speech says letter names, not sounds. `src/shared/junior/junior.test.ts` checks every template at 5 levels × 200 seeds: it must be answerable, the canonical answer must be correct, and every predicted mistake must be diagnosed.

**Voice.** Device text-to-speech (`speechSynthesis`) sits behind `client/features/junior/speech.ts`. It costs nothing and keeps no audio on a server. Three layers keep it from sounding robotic:
- **Words** (`shared/junior/packs/en/spoken.ts`): written maths becomes what a teacher would say. "3 + 4 = 7" becomes "3 plus 4 is 7", 12:05 becomes "five past twelve", R12,50 becomes "12 rand 50", "c-a-t" becomes "c, a, t", and numbers from 100 are said the South African way ("one hundred and five").
- **Narrator** (`shared/junior/narrate.ts`, phrases in `TALK` in the pack): praise, "not yet", hints, "Watch first" and the end of a set use varied lines. A diagnosed mistake is said once and is never repeated by the worked solution.
- **Voice choice**: natural or neural voices are preferred, then South African English, then British or Irish, then American. Novelty voices are pushed to the bottom. Speech is spoken a sentence at a time. Adults can choose and test a voice per device under "Where your children sign in".

`narration.test.ts` checks everything a child can hear, across every template, level and many seeds: no symbols read literally, no "something" for a blank, no "1 tens", no "a ice-cream". A recorded-voice or cloud voice provider can replace device speech behind the same `speak()` call.

**Languages (all 11 official).** `src/shared/junior/languages.ts` holds the codes, BCP-47 tags and a **review-gated status** per language for instructions and reading. Only English is `live`. A child's home language decides their subjects (`foundationSubjectsFor`):
- English: Home Language English.
- Any other language: Mathematics and Life Skills with English instructions, plus English First Additional Language, until that language's reviewed pack exists.

There is no machine translation. Children learning to read need text a fluent Foundation Phase teacher has checked, and the Nguni and Sotho-Tswana languages are taught through syllables, not English phonics. To turn a language on:
1. Write `packs/<lang>` and a reading module.
2. Have a teacher review them.
3. Flip the status.

Instruction strings still live inside the English generators. Moving them into packs is the first step of that work.

**Accounts and sign-in.** Children never have an email or password.
- A parent (`role = 'parent'`, invite-gated like learners) or a teacher of a Grade 1–3 class creates the child. Child accounts get `login_kind = 'picture'`, `created_by`, and a placeholder `<id>@child.invalid` address. That address is hidden from every DTO and refused by the mailer.
- The child signs in by tapping their name, then 3 of 12 pictures in order. Picture codes are encrypted at rest with AES-256-GCM, so adults can show them again.
- Sign-in works **only on a device an adult has set up**: an `ml_device` cookie whose hashed token is stored in `junior_devices`, scoped to a family or a class, and revocable from either list. The name list is never public.
- Five wrong codes lock that child for 10 minutes. Sign-in is also rate-limited per IP and per device.
- Parents get guardianships and teachers get class membership. `canAccessLearner` gained the parent rule; `canManageChild` decides edits. Deleting a parent or teacher account deletes the picture-sign-in children it created, because nobody else could manage them.
- The AI tutor is refused server-side for Grade 1–3 learners (`requireTutorLearner`).

**Adults' views.** Parents have *Your children* (`/family`). Teachers get a "Children and picture sign-in" section on Grade 1–3 classes (subject "All subjects"), plus printable sign-in cards. Both see the same child page: this week, what comes next and why, "How to help" built from mistake codes with adult-facing tips, mastery per subject, the cards, recent sessions, and settings. The weekly PDF report has Junior wording, such as sets finished instead of lessons and home tips instead of hints. Class flags for Grade 1–3 use first-try accuracy only.

**Data model additions (migration v5):**
- `users.login_kind`, `created_by`, `picture_code`, `picture_fails`, `picture_locked_until`
- `learner_profiles.home_language`
- `guardianships`, `junior_devices`, `card_log`
- `classes.subject_id` may be `all`

**Data model additions (migration v6):**
- `question_instances.retry_of`
- `junior_ican (child_id, skill_id, activity_id, earned_at)`
- `users.moved_up_at`

**Not built yet for Junior.**
- Automatic grade change at the start of a school year. Grade 1 → 2 and 2 → 3 are a manual grade change on the child page, and the new grade starts every skill at level 2 regardless of what the child mastered the year before.
- Grade 4 recommendations that use Foundation Phase mastery (a Grade 4 learner's catch-up does not look at their Grade 3 skills yet).
- Content for the 10 non-English languages, which needs fluent Foundation Phase teacher reviewers.
- Recorded voices: device voices for most South African languages are rare, especially on cheap Android phones.
- Handwriting and letter formation, and reading aloud with speech recognition.
- Offline play.
- A school-attested consent workflow beyond the teacher's checkbox, which is recorded as `:school-attested`.

## 9. Three experiences on CAPS phases

**Bonisa Junior** (Grades 1–3, Foundation Phase), **Bonisa** (Grades 4–9, Intermediate and Senior Phases) and **Bonisa Matric** (Grades 10–12, FET Phase). One product and one engine. A tier exists only where the experience genuinely changes: Junior is picture sign-in, voice and adult-led; Bonisa builds towards the Mathematics vs Mathematical Literacy choice at the end of Grade 9; Matric is aimed at the final exams. Intermediate and Senior share a tier because they share every tool; the phase is a label, not a separate brand.

**Naming follows CAPS exactly** (`src/shared/curriculum/phases.ts`). "Senior Phase" means Grades 7–9, never Grades 10–12, because that is what every teacher and education official reads it as. The UI labels grades as "Grade 8 · Senior Phase".

**Subjects follow CAPS too.** Natural Sciences is one subject for Grades 4–9 (named "Natural Sciences and Technology" in Grades 4–6 by `subjectName`), organised by the four CAPS strands as its topics: Life and Living, Matter and Materials, Energy and Change, Planet Earth and Beyond, plus Technology: Structures. Physical Sciences and Life Sciences hold only Grade 10–12 skills. `skillsForLearner` follows the CAPS path between them (`FEEDS` in `catalogue.ts`): Grade 9 Natural Sciences reaches Grade 10 physics and biology, shown in Learn as "Coming up in Grade 10", and Grade 10 learners can catch up on Grade 6–9 Matter, Energy or Life skills through Home and "Builds on" (Learn only shows tabs for the learner's own CAPS subjects). Migration v7 moved Grade 4–9 profiles and classes from Physical/Life Sciences to Natural Sciences. `phases.test.ts` checks that every skill sits at its CAPS grade, after its prerequisites, and that every Senior Phase grade has all four strands. Planet Earth and Beyond now has nine skills across Grades 4–9 (seven new), and the Periodic Table (Grade 7) and Visible light (Grade 8) complete the other strands. The nine new skills have their own labs (`EarthSpaceLabs.tsx`), generators (`ns-senior.ts`) and lessons (`lessons-ns.ts`).

**Brand lockup.** `Logo` takes a `tier`: "Bonisa" in bold, then "Junior" or "Matric" in the same type at regular weight. The shell shows the learner's tier; onboarding switches the lockup as soon as a grade is picked and groups the grades by phase; Junior sign-in shows Bonisa Junior. Teachers and parents see plain Bonisa.

**Look ahead** (`isLookAhead`: skill grade > learner grade + 1, Grades 4–12 only). Curiosity is the point, so nothing is hidden, but a preview must never be mistaken for the learner's own work:
- Learn shows the learner's band. Look ahead is a separate, dashed section per subject tab, grouped by phase with the tier named, and every row is marked Preview. If the subject changes its name in that phase, it says so.
- Practice on a look-ahead skill is titled "Look ahead: …", gives full feedback, hints and worked solutions, and **never changes mastery** (`skill_states` is untouched; the response is stored with `rating_before = rating_after` and `FeedbackDto.preview`). So a Grade 7 who tries calculus and struggles starts Grade 12 with a clean slate, and no adult sees it as a weakness.
- Tests refuse look-ahead skills (`422 look_ahead`). Recommendations, Home, weak areas, exam readiness and teacher views already use the band only.
- Work a teacher assigns always counts, whatever its grade.

## 10. Euclidean geometry (Paper 2)

The first Paper 2 topic: five skills in a new `euclidean` topic, following the CAPS Grades 10–12 theorem list. `docs/CAPS-COVERAGE.md` §4 has the full Mathematics audit and the build order.

| Skill | Grade | What it covers |
|---|---|---|
| `quadrilaterals` | 10 | Properties of the special quadrilaterals, used as reasons |
| `midpoint-theorem` | 10 | Midpoint theorem and its converse |
| `circle-theorems` | 11 | Perpendicular from the centre, angle at the centre, semicircle, same segment |
| `cyclic-tangents` | 11 | Cyclic quadrilaterals (opposite and exterior angles), tangents from a point, tangent–chord |
| `proportionality` | 12 | Proportionality theorem, similar triangles, Pythagoras by similar triangles |

**Diagrams are data.** Questions carry a `GeometryFigure` (`kind: 'geometry'`): named points in maths coordinates, segments with equal-length ticks and parallel arrows, circles, and angle marks. `Figure.tsx` fits it into the box and places each label in the widest gap between the lines that meet at its point, so labels avoid lines and angle marks without hand placement. Every figure has alt text that states the givens.

**Diagrams must be true.** `geometry.test.ts` generates 150 seeds × 5 levels × 5 skills and checks that every figure has alt text and valid segments, that every marked angle (including right-angle marks) matches the drawn angle to within 1.5°, and that the angle marked x is the answer. A learner who measures the diagram should get the right answer.

**Reasons are taught as reasons.** `REASONS` in `math-geometry.ts` holds 22 reasons in the wording South African markers expect (e.g. "opp ∠s of cyclic quad", "tan ⊥ radius"). Reason questions show a diagram and a statement and offer the right reason with three plausible wrong ones; each wrong one explains what that reason actually says. New mistake codes: `geometry-reason`, `parallel-angles`, `midpoint-ratio`, `circle-theorem`, `proportion-ratio`.

**Labs come before theorems.** `GeometryLabs.tsx`: a quadrilateral explorer (live property checklist as the shape changes), a midpoint lab, a circle lab (angle at the centre, same segment and diameter; cyclic quad and tangent–chord) and a parallel-line lab. Each lesson asks for a prediction, lets the learner find the pattern in the lab, then states the theorem.

**Proofs** are in §15.

## 11. Analytical geometry (Paper 2)

Three skills in the `analytical` topic, each with a lab mode (`AnalyticLabs.tsx`, `coord-lab`) and a lesson (`lessons-analytic.ts`):

| Skill | Grade | Lab |
|---|---|---|
| `coordinate-geometry`: distance, midpoint, gradient; parallel, perpendicular, collinear | 10 | Drag A and B; the right triangle, AB and M update |
| `line-equations`: line through a point, parallel or perpendicular; inclination; angle between lines | 11 | Drag a line; a second line through P stays parallel or perpendicular; θ is marked |
| `circle-equations`: equation of a circle, completing the square, tangent at a point | 12 | Drag the centre, change the radius, move P; the tangent stays ⊥ the radius |

**Two new answer types**, because analytical geometry is written as equations and points:
- `equation`: the learner types a whole equation with one = sign. It is right when lhs − rhs is a non-zero multiple of the answer's, so `y = -1/2x + 3`, `2y = -x + 6` and `x + 2y - 6 = 0` all count, and `(x - 2)^2 + (y + 3)^2 = 25` matches its expanded form. `1/2x` reads as ½x, as learners write it.
- `point`: two boxes, written `M( ; )`. Graded exactly, so `3,5`, `3.5` and `7/2` are the same.

The `graph` figure gained `segments`, `circles` (always drawn round, on equal scales) and a `text` override for labels such as `B(k; 5)`. `analytic.test.ts` checks the equation and point grading, and checks the answers independently: every named point lies on the answer circle, the tangent is the line through P perpendicular to CP, and every line passes through its point.

## 12. Trigonometry (Paper 2)

Six new skills in the `trigonometry` topic, after the existing Grade 10 `trig-ratios` (right-angled triangles); the sixth, `trig-2d-3d`, is described below the table:

| Skill | Grade | What it covers |
|---|---|---|
| `trig-special` | 10 | Special-angle values, ratios from x, y and r in any quadrant, simple equations (0°–90°) |
| `trig-reduction` | 11 | CAST, reduction formulas (including 90° ± x and negative angles), "if sin 34° = p", identities |
| `trig-equations` | 11 | All solutions in an interval, general solution, angles like 2x and x + 20°, quadratic-type equations |
| `triangle-rules` | 11 | Sine, cosine and area rules, with triangles drawn to scale |
| `compound-angles` | 12 | Compound and double angles: exact values, "given sin α in a quadrant", simplifying |

**Exact answers by design.** Exam trigonometry is mostly done without a calculator, so most questions are built to have rational answers that can be graded exactly: combinations of special angles, reduction of rational-valued angles, compound angles that land on 30°, 60°, 90°…, and Pythagorean triples for "given $\sin\alpha$ in a quadrant". Only the triangle rules and calculator equations use rounded answers. Equations use the `roots` input.

**Every answer is checked against the question it belongs to.** `trig.test.ts` turns each question's own TeX into JavaScript and evaluates it: expressions must equal the stored answer, every root must satisfy its equation, no exact root on a 0,5° grid may be missing, and triangle answers must match the triangle that is drawn (side lengths, angles, area). Exact values are checked against the calculator for every multiple of 15° from −720° to 720°.

**Labs** (`TrigLabs.tsx`, `trig-lab`): a terminal arm you turn through 360° with x, y, r, CAST and the reference angle, and a triangle whose sides and angle you change while the three sine-rule ratios stay equal. Geometry figures gained side labels (`segments[].text`).

**2D and 3D** (`trig-2d-3d`, Grade 12, `math-trig-3d.ts`): two triangles that share a side. 2D: a quadrilateral split by a diagonal (cosine rule, then sine rule) and a tower seen from two points in line. 3D: a vertical tower PQ on a horizontal plane with R and S; find the height, a ground distance, a ground angle or the area of the ground triangle. 2D figures are true to scale; 3D figures use an oblique projection, like exam diagrams (angle marks can take `r` to keep two marks at one vertex apart). `trig.test.ts` checks 2D answers against the drawn figure and recomputes 3D answers independently from the numbers in the prompt. Answers allow 0,3% because learners round the first side before using it.

**Equations don't reveal how many solutions they have.** The `roots` input starts with one box; the learner adds more ("+ Add another solution") or removes them. Grading tells a learner who found some but not all solutions `missing-solutions`, and one who added a wrong value `extra-solutions`, without giving the missing ones away. Answers may be typed as `x = 30°`.

Trig graphs are in §14.

## 13. Statistics (Paper 2)

Three skills in the `statistics` topic (`math-stats.ts`, `lessons-stats.ts`, `StatsLabs.tsx`):

| Skill | Grade | What it covers |
|---|---|---|
| `stats-summary` | 10 | Mean, median, quartiles and IQR, reading box-and-whisker plots, estimated mean of grouped data |
| `stats-spread` | 11 | Standard deviation, values within one σ, reading ogives (counts and the median), outliers |
| `stats-regression` | 12 | Describing correlation from a scatter plot, the regression line $\hat{y} = a + bx$, $r$, predicting |

**No learner is marked wrong for their teacher's quartile method.** Quartile questions use n = 4k + 3 values, where the two methods taught in South African schools (median of each half, and position $(n + 1)/4$) give the same answer. `stats.test.ts` checks both methods on every quartile question.

**CAPS conventions.** Standard deviation is the population σ (divide by n); the sample $s$ is a diagnosed mistake ("choose σx, not sx"). Data comes from South African contexts (taxi waiting times, Pietermaritzburg rainfall, car values in rand).

**Checked independently.** `stats.test.ts` recomputes every answer from the data shown in the question: means, medians, quartiles, grouped means, σ, counts, ogive readings, the single outlier, and $a$, $b$ and $r$ by a different formula from the generator's. Correlation labels must match the plotted points' $r$ (strong: $|r| \ge 0{,}9$; weak: $0{,}35$–$0{,}6$; none: $|r| \le 0{,}15$), so a learner is never asked to judge a borderline plot.

**Labs:** a dot plot you drag (mean, median, σ band and box plot update together: drag one value out and watch the mean move while the median stays), and a scatter plot you drag (regression line and $r$).

**Figures.** The `graph` figure gained `hideY` (a number line for box plots) and axis titles. Axis ticks now pick a "nice" step (1, 2, 5, 10, 20, 25, 50…) for about eight labels, so graphs with large values (rand, marks out of 100) stay readable.

## 14. Functions and graphs (Paper 1)

Four skills in the `functions` topic, after the existing `gradient` and `straight-line` (`math-graphs.ts`, `lessons-graphs.ts`, `FunctionLabs.tsx`):

| Skill | Grade | What it covers |
|---|---|---|
| `graphs-basic` | 10 | Parabola, hyperbola and exponential: intercepts, asymptotes, range, equation from a sketch, where a parabola meets a line |
| `graphs-shifted` | 11 | Effect of p: turning points, asymptotes, $x = -\dfrac{b}{2a}$, equations from a turning point, average gradient, axes of symmetry of a hyperbola |
| `trig-graphs` | 11 | Amplitude, maximum and minimum, period, equations from a graph (a, q in Grade 10; k, p in Grade 11), intersections |
| `inverse-log` | 12 | Inverse of a linear function, $f^{-1}$ of $ax^2$, logs, log laws, exponential equations |

`trig-graphs` sits at Grade 11 because its upper levels use k and p; Grade 10 learners see it in their band, with Grade 10 content (a and q) in its first levels.

**One idea throughout.** The lessons and the lab teach a, p and q as doing the same job on every graph: q up or down (and the asymptote with it), p left for $+p$, the sign of a flips. The lab switches between parabola, hyperbola and exponential with the same three sliders, and has a trig mode with k.

**Curves.** The `graph` figure gained `curves`: polylines sampled by the generator (`sample()` splits a curve into branches where it leaves the box or is undefined, so hyperbolas and tan graphs are drawn correctly), plus `xStep` for fixed ticks (90° on trig graphs). The lab uses the same `sample()`.

**Checked against the function itself.** `graphs.test.ts` turns each question's equation into a function and checks the answer against it: intercepts make $y = 0$, turning points are where the graph is symmetric, asymptotes are where it is undefined or levels off, equations pass through every plotted point, average gradients, axes of symmetry through the asymptotes' crossing, maxima found by sampling, periods that repeat (and are the smallest that do), inverses that undo $f$, and log values.

**A known limit.** Hyperbola equations can't yet be typed as answers (the equation checker handles polynomials, and $\dfrac{a}{x}$ isn't one), so hyperbola sketches ask for $a$ instead.

## 15. Euclidean proofs (Paper 2)

Two skills in the `euclidean` topic (`math-proofs.ts`, lessons in `lessons-geometry.ts`):

| Skill | Grade | Levels 1–3 (riders) | Level 4 (harder riders) | Level 5 (theorem proofs) |
|---|---|---|---|---|
| `circle-proofs` | 11 | ∠OAB = 90° − x from the centre angle; ∠ACB = 90° − ½y from two tangents; AB = AC from a tangent parallel to a chord | PAOB is cyclic; a parallel from the centre bisects a chord | Perpendicular from the centre; angle at the centre; opposite angles of a cyclic quad; tan chord |
| `similarity-proofs` | 12 | △ADE ∣∣∣ △ABC and the ratio; AB² = BD·BC; DE ∥ BC from given lengths (the converse) | Intersecting chords; tangent and secant | Proportionality (area proof); equiangular triangles; Pythagoras |

**Complete the proof.** A new input, `proof`: a statement–reason table in which some cells are blanks, each a native select with four options. Level 1 blanks reasons, level 2 statements, levels 3–5 both, never a statement and its own reason together (each is the clue to the other), and never the final statement (it is in the prompt). The answer is the list of option ids; marking names the steps that are wrong without saying what goes there ("2 of 3 blanks are right. Look again at the reason in step 1"), and after marking each blank shows ✓ or ✗. Option ids are shuffled per question, so the id says nothing about the answer. On phones the table stacks: statement, then reason.

**Why choose rather than write.** Marking free-text proofs reliably needs either a teacher or model-based marking, and a wrong mark on a proof teaches the wrong thing. Choosing from close alternatives still tests the two things exam markers look for (does this statement follow; is this the theorem that says so), and the distractors are the classic errors: the theorem instead of its converse, the theorem being proved used as its own reason, alternate for corresponding angles, triangles named in the wrong order, ratios upside down.

**Different letters, same rider.** Each rider is relabelled with a random run of letters (O stays the centre; I and O are never used). Only whole capital-letter names made entirely of the rider's points are renamed, so RHS, SAS and TeX are untouched.

**Every statement is measured.** `proofs.test.ts` (300 seeds × 5 levels × 2 skills; it also passed at 1 500 seeds) reads each statement as a claim about the diagram: angles, lengths, areas, ratios, parallel lines, cyclic quads, similar and congruent triangles, with x and y read from the marked angles. Every given statement and every right option must be true in the drawing; every wrong option must be false by more than 1%. Building it found five drawings where a wrong option happened to be true (for example an equilateral triangle, or chords crossing at right angles), now kept out by the generators' ranges. It also checks that every right reason is from `PROOF_REASONS`, that marking names the wrong step, and that an empty blank is refused rather than marked.

**Not built.** Grade 10 proofs (quadrilateral properties, midpoint theorem), the converse "line from the centre to the midpoint of a chord is ⊥", and writing a proof from a blank page.

