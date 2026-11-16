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

**What can be added** (`src/shared/curriculum/papers.ts`, `GET /api/exams/options`). One list, "What are you writing?", built from the learner's own subjects:
- **Grades 10–12 Mathematics and Physical Sciences** offer Paper 1, Paper 2 and a class test. A paper lists only its own skills, using the DBE examination guidelines' split. Mathematics Paper 1 is algebra, equations, patterns, functions, finance, calculus and probability. Paper 2 is statistics, analytical geometry, trigonometry and Euclidean geometry. Trig graphs are Paper 2, listed under Trigonometry there. Physical Sciences Paper 1 is Physics and Paper 2 is Chemistry.
- **Life Sciences** is one exam until its paper split is checked. **Grades 4–9** have one exam per subject.
- **Ticked when the form opens:** the learner's own grade (a Grade 12 learner gets Grades 10–12, because the final covers all three). Earlier grades are listed unticked. A class test starts with nothing ticked.
- **Never listed:** skills above the learner's grade.
- **On the server:** `exams.paper` (migration v8) stores the paper, and the server keeps only skills that belong to the chosen option, so a Paper 1 exam can't hold trigonometry. A blank name becomes the option's label ("Mathematics Paper 1"). `papers.test.ts` checks the split, that the two papers together are the whole subject with no overlap, and the defaults for every grade.

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

The audit checks every screen, every lesson (115 at the last count) and every Junior question type. It runs at 320, 360, 390 and 412 px and in landscape, in light and dark mode. It flags overlaps, page overflow measured against the phone's real width, labels wider than their buttons, and content hidden under fixed bars.

### Review against the generic defaults
- The first draft used a warm cream background with a serif display. That is the commonest generated look, so it became the cool desk green with a single sans.
- The first draft gave links and accents an "AI blue" with no meaning. Pen blue is now reserved for learner-manipulable things and input. Primary buttons are ink.
- Cards everywhere was replaced by sheets plus typography. Lists are lists, not card grids.

## 6. Not built yet (on purpose)
- A guardian dashboard for **Grade 4–12** learners. Their guardians get weekly PDF reports by email. Parent accounts exist, but only for the Grade 1–3 children they create (§8).
- School-level admin (many teachers, one school) and sponsor/impact dashboards.
- Diagram labelling. Supported today: numeric, exact fraction, expression with a form check (expanded/factorised), equation (any equivalent rearrangement), coordinate pair, root sets, coefficients, multiple choice, complete-the-proof, solution sets of inequalities, formulas (§18), exact surds (§20), algebraic fractions in simplest form (§22), completed-square form and surd roots (§23). Junior adds pick-many, ordering, sorting into groups, building with counters, ten-frames, base-10 blocks and coins, clock setting and spelling with letter tiles. A number-line input exists in the client but no generator uses it yet.
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
| `circle-proofs` | 11 | ∠OAB = 90° − x from the centre angle; ∠ACB = 90° − ½y from two tangents; AB = AC from a tangent parallel to a chord | PAOB is cyclic; a parallel from the centre bisects a chord | Perpendicular from the centre; the line from the centre that bisects a chord is ⊥ (SSS, then ∠s on a str line); angle at the centre; opposite angles of a cyclic quad; tan chord |
| `similarity-proofs` | 12 | △ADE ∣∣∣ △ABC and the ratio; AB² = BD·BC; DE ∥ BC from given lengths (the converse) | Intersecting chords; tangent and secant | Proportionality (area proof); equiangular triangles; Pythagoras |
| `quadrilateral-proofs` | 10 | Opposite sides of a parallelogram; its diagonals bisect each other; a rectangle's diagonals are equal | A rhombus's diagonals are perpendicular; both pairs of opposite sides equal ⇒ a parallelogram (*alt ∠s =*) | The midpoint theorem (construction: extend DE to F, then DBCF is a parallelogram) |

**Complete the proof.** A new input, `proof`: a statement–reason table in which some cells are blanks, each a native select with four options. Level 1 blanks reasons, level 2 statements, levels 3–5 both, never a statement and its own reason together (each is the clue to the other), and never the final statement (it is in the prompt). The answer is the list of option ids; marking names the steps that are wrong without saying what goes there ("2 of 3 blanks are right. Look again at the reason in step 1"), and after marking each blank shows ✓ or ✗. Option ids are shuffled per question, so the id says nothing about the answer. On phones the table stacks: statement, then reason.

**Why choose rather than write.** Marking free-text proofs reliably needs either a teacher or model-based marking, and a wrong mark on a proof teaches the wrong thing. Choosing from close alternatives still tests the two things exam markers look for (does this statement follow; is this the theorem that says so), and the distractors are the classic errors: the theorem instead of its converse, the theorem being proved used as its own reason, alternate for corresponding angles, triangles named in the wrong order, ratios upside down.

**Different letters, same rider.** Each rider is relabelled with a random run of letters (O stays the centre; I and O are never used). Only whole capital-letter names made entirely of the rider's points are renamed, so RHS, SAS and TeX are untouched.

**Every statement is measured.** `proofs.test.ts` (300 seeds × 5 levels × 2 skills; it also passed at 1 500 seeds) reads each statement as a claim about the diagram: angles, lengths, areas, ratios, parallel lines, cyclic quads, similar and congruent triangles, with x and y read from the marked angles. Every given statement and every right option must be true in the drawing; every wrong option must be false by more than 1%. Building it found five drawings where a wrong option happened to be true (for example an equilateral triangle, or chords crossing at right angles), now kept out by the generators' ranges. It also checks that every right reason is from `PROOF_REASONS`, that marking names the wrong step, and that an empty blank is refused rather than marked.

**Grade 10 drawings are kept general.** A parallelogram is redrawn until its sides and diagonals are all at least 8% apart, a rhombus avoids 60° (where AB = BD) and the midpoint triangle is clearly scalene, because the measuring test found drawings where a wrong option was true by coincidence. It also found one wrong option that is always true (in a rhombus, △ABE ≡ △CBE by symmetry), which was replaced. The quadrilateral and circle proofs also passed at 1 500 seeds. The test now blanks four-letter names (DBCF) as well as lines when it compares reasons.

**Not built.** Writing a proof from a blank page.

## 16. Calculus and cubic polynomials (Paper 1)

Five Grade 12 skills (`math-calculus.ts`, `lessons-calculus.ts`, `CalculusLabs.tsx`), next to the existing `derivatives` (power rule):

| Skill | Topic | What it covers |
|---|---|---|
| `factor-theorem` | algebra | Remainders, finding k, factorising a cubic from one factor, solving cubic equations, two unknown coefficients |
| `first-principles` | calculus | Limits by factorising, $f(x + h) - f(x)$, $f'(x)$ from first principles (quadratics, $ax^3$, $\frac{k}{x}$) |
| `tangent-lines` | calculus | Tangent at a point (quadratic, cubic), the point with a given gradient, tangents parallel or perpendicular to a line, where a cubic's tangent is parallel to a line |
| `cubic-graphs` | calculus | Point of inflection and concavity, local maximum and minimum, $a$ from a sketch, reading a graph of $f'$, how many $k$ give $f(x) = k$ three roots |
| `optimisation` | calculus | Velocity and flow rates, maximum height, rest times and acceleration, the open box, fencing along a river, maximum profit |

**Built backwards.** Every function is made from its answer (roots, turning points $f'(x) = 3a(x - p)(x - q)$, the best cut of a box), so answers are exact and come out as whole numbers or simple fractions. Open boxes come from a precomputed list of sheets whose best cut is a whole number.

**Checked independently.** `calculus.test.ts` reads the function back out of each prompt (or the figure) and checks the answer numerically, without the generator's construction: roots are substituted and a cubic needs all three, derivatives are compared with finite differences, tangents must touch the curve with the right gradient (and be parallel or perpendicular as asked), turning points are classified by $f''$, intercepts drawn on a sketch must lie on the curve, maxima are found by golden-section search, and the count of $k$ values is recounted from the turning values.

**Labs.** `calculus-lab` has three modes: *secant* (drag $h$ to 0 and watch the secant gradient $2a + h$ become $f'(a)$), *cubic* (change $a$, $b$, $c$, $d$; $f$ and a dashed $f'$ together, with turning points and the point of inflection marked) and *box* (cut squares from a 16 × 10 sheet; the volume graph has a flat tangent at the best cut, 2 cm).

**Negative and fractional powers** are in §21. New mistake codes: `remainder-theorem`, `limits`, `first-principles`, `tangent-line`, `inflection`, `stationary-points`, `rate-of-change`, `optimisation`.

## 17. Probability (Paper 1)

Three skills in a new `probability` topic (`math-probability.ts`, `lessons-probability.ts`, `ProbabilityLabs.tsx`):

| Skill | Grade | What it covers |
|---|---|---|
| `probability-rules` | 10 | Reading a Venn diagram, the addition rule (both ways round), mutually exclusive and complementary events, a survey with the overlap unknown ($x$), two dice, relative frequency and expected counts |
| `independent-events` | 11 | Independent "and"/"or", testing for independence, tree diagrams with and without replacement, two-way tables (independence and the addition rule), three-set Venn diagrams |
| `counting-principle` | 12 | Outfits and codes (with and without repetition), $n!$, arrangements with a rule (together, apart, at an end, begins with a vowel), words with repeated letters, probability by counting |

**Three new figure kinds.** `venn` (2 or 3 sets; regions keyed by the sets they are inside, values in TeX so a region can read $12 - x$), `tree` (up to two stages; each probability sits 60% along its branch, above a rising branch and below a falling one, so siblings never touch) and `table` (a two-way table with totals). Venn and tree labels are HTML laid over the SVG, so they are KaTeX and stay in place at any width.

**South African contexts.** Taxi ranks, hostels (pap, rice, samp), isiZulu and Sesotho speakers, codes and number plates, and words such as TSHWANE, MZANSI, SOWETO and MAMELODI for the counting questions.

**Checked by listing outcomes.** `probability.test.ts` recomputes every answer from what the question shows: Venn and table answers are recounted from the figure (and the table's totals must add up; in the survey, $x$ is solved from the prompt and every region must be positive), dice by listing all 36 pairs, bags by listing every ordered draw of labelled items (with or without replacement), tree branches must add to 1, and arrangements by listing every permutation. Repeated-letter words are counted by a recursive count of distinct words, not by $\dfrac{n!}{a!\,b!}$. Building it caught a test-side cache collision, not a generator error.

**Labs.** `probability-lab` has three modes: *dice* (roll 1, 10 or 100 at a time; relative frequency against the theoretical line), *venn* (change $n(S)$, $n(A)$, $n(B)$ and the overlap; the addition rule and $P(A) \times P(B)$ against $P(A \text{ and } B)$ update together, and the note says when the events are independent or mutually exclusive) and *slots* (the counting principle as boxes).

**New mistake codes:** `venn-regions`, `addition-rule`, `complement`, `sample-space`, `independence`, `tree-branches`, `with-replacement`, `counting-principle`, `arrangement-restriction`, `identical-items`.

## 18. Equations and inequalities (Paper 1)

Five skills in the `equations` topic (`math-equations.ts`, `lessons-equations.ts`, `EquationLabs.tsx`), next to the existing `linear-equations`, `quadratic-equations` and `quadratic-formula`:

| Skill | Grade | What it covers |
|---|---|---|
| `simultaneous-equations` | 10 (11) | Elimination, substitution, word problems (tickets, pizzas, coins, a quiz, taxis), a line and a parabola, a line and a quadratic in $x$ and $y$ |
| `literal-equations` | 10 | Changing the subject: 59 formulas from maths and science in five levels (one step, two steps, squares and roots, several steps, the subject appearing twice) |
| `linear-inequalities` | 10 | Reading a number line, reversing the sign for a negative coefficient, double inequalities, counting integers in a solution, brackets and fractions, the largest or smallest integer |
| `quadratic-inequalities` | 11 | Factorised and expanded forms, a negative leading coefficient, rearranging, a fractional critical value, reading $f(x) \le 0$ or $f(x) \ge g(x)$ off a graph, perfect squares ($x \ne a$, $x = a$), "all real $x$", difference of squares |
| `roots-parameter` | 11 | A given root fixes $k$; equal roots ($k = \pm …$); real, unequal or non-real roots as an inequality in $k$, including $k$ in the middle coefficient (a quadratic inequality in $k$) and as the leading coefficient ($k \ne 0$) |

**Two new answer kinds.** `inequality` (`inequality.ts`): learners type a solution set the way they would write it: `x < -2 or x >= 3`, `-1 < x ≤ 4`, `x ≠ 3`, `all real`, or interval notation with semicolons, `(-∞; 2]` (the comma is the decimal comma). Answers are compared as sets, so any correct way of writing the set is right. Two mistakes are diagnosed for every inequality question without the generator listing them: the right boundaries with the wrong ends included (`inequality-endpoint`), and exactly the opposite set (`inequality-direction`). The input shows the set back in TeX and on a number line as the learner types. `formula` (`formula.ts`): a small parser for answers with division by letters, roots and π (`(v - u)/t`, `√(A/π)`, `2(s - ut)/t²`). Two formulas match when they agree at 24 sample points where both are defined; any order or arrangement is right. An answer that still contains the subject, or a letter not in the formula, gets its own feedback. Lower-case `pi` is π; `Pi` is $P \times i$.

**One new figure kind.** `numberline`: a solution set with open and closed dots and arrows to infinity. The same component draws the live preview under the inequality input.

**Checked against the question.** `equations.test.ts` reads every equation back out of the prompt (TeX → formula) and substitutes the answer. Simultaneous answers must satisfy both equations (and the lines must not be parallel; a quadratic system must not be an identity). Formula answers are substituted back into the original formula at five sets of values, and every wrong answer must fail. Inequality answers are checked value by value: at every whole number from −30 to 30, at each boundary and just either side of it, a value is in the answer exactly when it makes the original inequality true. Graph questions are checked against the drawn curve, point by point. Conditions on $k$ are checked by working out the discriminant at each test value of $k$. Building it caught one generator bug (a `-0` answer) and one bound too large for a sensible question.

**Labs.** `equation-lab` has three modes: *lines* (two lines and their crossing; parallel lines give no solution, the same line infinitely many), *flip* (multiply both sides of $a < b$ by $k$ and watch the order reverse for $k < 0$) and *quadratic* (roots, a sign and upside down; the solution is marked on the $x$-axis). The roots-parameter lesson reuses the existing `discriminant-lab`.

**New mistake codes:** `inequality-endpoint`, `inequality-direction`, `inequality-flip`, `quadratic-inequality`, `simultaneous`, `change-subject`, `discriminant-condition`.

**Completing the square** is in §23. The formula checker is also what marks derivatives of negative and fractional powers ($-\dfrac{k}{x^2}$, $\dfrac{3}{2}\sqrt{x}$), in §21.

## 19. Finance, growth and decay (Paper 1)

Five skills in the `finance` topic (`math-finance.ts`, `lessons-finance.ts`, `FinanceLabs.tsx`), after the Grade 10 `finance` skill (simple and compound interest, monthly compounding, doubling time):

| Skill | Grade | What it covers |
|---|---|---|
| `finance-applications` | 10 | Exchange rates both ways, hire purchase (instalment and total cost), inflation forwards and backwards, population growth and its rate, a weaker rand, a trip's change, the rate a shop charges |
| `depreciation` | 11 | Straight-line and reducing-balance book values, the cost from a book value, the rate, comparing the methods, when straight-line reaches a value, saving for a replacement |
| `nominal-effective` | 11 | Nominal ↔ effective, comparing two offers, a rate that changes part-way, deposits and a withdrawal on one timeline |
| `future-value-annuities` | 12 | Savings, the payment for a goal, sinking funds, a payment today (one extra payment), payments that stop while the money stays in, the number of months to reach a goal |
| `present-value-annuities` | 12 | The largest affordable loan, repayments (with a deposit), interest paid, the outstanding balance, the number of payments (full, or to settle), a delayed first payment, the final payment |

**Money is exact where it matters.** Answers are to the cent and accept 0,02% either way, so a learner who keeps $i = \frac{r}{12}$ in the calculator is right; rounding $i$ early (to 0,0058, say) usually lands outside, as an exam marker would expect. Percentages are to two decimals. Counts of months are exact, and the question says whether to round up (to settle or reach a goal) or down (full payments). Worked solutions show $\tfrac{0{,}085}{12}$, never a rounded rate. An outstanding balance is accepted by either method (present value of the remaining payments, or the loan run forward); the test checks both against the tolerance.

**Checked by simulation.** `finance.test.ts` reads every amount, rate and period back out of the prompt and runs the money period by period: savings get interest and then the payment each month, a loan gets interest and then the repayment, an asset loses its depreciation each year. Unknowns (a payment, a loan, a cost, a rate) are found by bisection on the simulation, and month counts by running until the goal is reached or the loan is settled. It never uses the closed formulas the generators use. Breaking four of the generators' formulas on purpose (the future value, the effective rate, straight-line depreciation and the hire purchase deposit) made all five finance tests fail.

**Rendering.** Prices in US dollars need a literal dollar sign, so `RichText` now reads `\$` as one (it was always the start of maths); the KaTeX checks in the question and content tests know the same rule. A bare `R` answer prefix is set upright (`\text{R}`), not as an italic variable, everywhere, including the Grade 10 skill. `Plot` takes an optional `padLeft` for wide y labels; the default is unchanged.

**Labs.** `finance-lab` has four modes: *depreciation* (straight-line against reducing balance on one machine), *effective* (one nominal rate compounded annually to daily, as bars), *savings* (monthly savings split into what you paid in and interest earned) and *loan* (the balance month by month; a repayment at or below the first month's interest never pays the loan off). The labs simulate rather than use the formulas, so they show where the formulas come from.

**New mistake codes:** `exchange-rate`, `hire-purchase`, `depreciation-method`, `nominal-effective`, `timeline`, `annuity-formula`, `annuity-timing`, `outstanding-balance`, `annuity-term`.

## 20. Surds, patterns and series (Paper 1)

Four skills (`math-surds-patterns.ts`, `lessons-number.ts`, `NumberLabs.tsx`):

| Skill | Topic | Grade | What it covers |
|---|---|---|---|
| `surds` | algebra | 11 | Between which whole numbers a surd lies, simplifying, adding like surds, expanding (including $(\sqrt{a} \pm \sqrt{b})^2$ and conjugates), rational exponents, rationalising (by $\sqrt{b}$ and by the conjugate), surd equations with a false root, $x^{\frac{p}{q}} = k$ |
| `linear-patterns` | patterns | 10 | General term, any term, which term has a value, contexts (tables, matchsticks, tiles), the smallest number of shapes for more than a value, an unknown $x$ in a linear pattern, the general term from two terms |
| `quadratic-patterns` | patterns | 11 | Next term, general term from second differences, any term, which term has a value, contexts (handshakes, lines between points, matches, triangular dots), a missing term, the smallest term |
| `series` | patterns | 12 | Number of terms in sigma notation, evaluating a sum, sum to infinity, the ratio from $S_\infty$, convergence as an inequality in $x$, how many terms give a sum, $T_n = S_n - S_{n-1}$ |

**A new answer kind: exact surds.** `surd.ts` reduces an answer exactly to "rational + $\sum c\sqrt{r}$" with square-free $r$: it multiplies, divides by a single surd or a conjugate pair, takes roots of rationals and evaluates rational powers. So any correct value is recognised, however it is written. Separately, *simplest form* is checked on what the learner typed: square factors out, no surd in a denominator, no powers, brackets expanded, like surds collected, fractions cancelled. A right value in the wrong form is marked as unsimplified, with the specific problem ("Take the square factors out of √72", "Rationalise the denominator", "Cancel the fraction"). The input is the formula input with a √ key, a "reads as" preview and no letters.

**Checked against the prompt.** `surds-patterns.test.ts` evaluates each surd prompt numerically and requires the answer to equal it with square-free radicands; surd equations are solved by trying every whole number from −200 to 4 000 (all their roots are whole numbers), so a kept false root or a lost real one fails. Pattern answers are recomputed from the listed terms (whose differences are checked), context answers from the table in the prompt, and series by adding terms one by one (sums to infinity to 3 000 terms); convergence answers are tested value by value. The surd engine has its own tests, including ten forms it must refuse as not simplest. Breaking four generator formulas on purpose made all four generator tests fail.

**A parser fix found on the way.** `6sqrt(2)` and `2pi` were not read, because the `sqrt` and `pi` patterns needed a word boundary and there is none between a digit and a letter. Both now work everywhere formulas are typed (equations, literal equations, surds), with tests.

**Labs.** `number-lab` has three modes: *surd* (a square of area $n$ cut into $k \times k$ small squares of area $s$, so its side is $k\sqrt{s}$), *differences* (a quadratic pattern's table of first and second differences, its formula and its dots) and *series* (partial sums of a geometric series against $S_\infty$, settling only for $-1 < r < 1$).

**New mistake codes:** `surd-simplify`, `surd-add`, `surd-expand`, `rationalise`, `extraneous-root`, `rational-exponent`, `term-number`, `second-difference`, `sigma-notation`, `sum-to-infinity`, `convergence`.

The Grade 10 algebraic expressions are in §22, completing the square in §23.

## 21. Derivatives of negative and fractional powers (Paper 1)

One Grade 12 skill, `derivative-powers` (`math-calculus-powers.ts`, lesson in `lessons-calculus.ts`), which closes the last calculus gap:

| Level | What it asks |
|---|---|
| 1 | One term written naturally: $\dfrac{5}{x^4}$, $6\sqrt[3]{x^2}$, $2x\sqrt{x}$, $\dfrac{3}{\sqrt{x}}$ |
| 2 | A positive power, a negative power, a root and a constant together, as $f'(x)$ or $\dfrac{dy}{dx}$ |
| 3 | Rewrite first: divide a quotient out, expand $(\sqrt{x} + c)^2$ or $\sqrt{x}(x - c)$ |
| 4 | The gradient at a point (an exact fraction), or the tangent to $y = \dfrac{k}{x} + q$ |
| 5 | Turning points of $ax^2 + \dfrac{b}{x}$ and $a\sqrt{x} - bx$ |

**Derivatives are typed, not chosen.** The answer is a `formula` (§18), marked by value at sample points, so $-\dfrac{12}{x^4}$, `-12x^(-4)` and `-12/x^4` are all right, and `3/(2sqrt(x))` reads as written. The predicted mistakes are the ones teachers see: lowering a negative power the wrong way ($-2 \to -1$), forgetting to multiply by the power, differentiating a denominator on its own, differentiating the top and bottom of a fraction separately, and treating $(\sqrt{x} + c)^2$ with the chain rule.

**Checked numerically.** `calculus-powers.test.ts` reads $f$ from the prompt (including $\sqrt[3]{x^2}$) and differentiates it by central differences at five points; every answer must match and every predicted mistake must not. Tangents must touch the curve with that gradient; turning points need $f' = 0$, a sign change in $f'$, and $y$ from $f$. Breaking the power rule for negative powers, or the tangent's gradient, made the test fail.

**Lab.** `calculus-lab` gained a *powers* mode: choose $n$ from $-2$ to $3$ (including $\frac{1}{2}$ and $\frac{3}{2}$), move the point, and the tangent's gradient $nx^{n-1}$ is shown next to a tiny secant's, which agrees.

**New mistake code:** `rewrite-first`.

## 22. Products, factors and algebraic fractions (Grade 10, Paper 1)

Two Grade 10 skills in the `algebra` topic (`math-algebra10.ts`, `lessons-algebra10.ts`, `AlgebraLabs.tsx`), after `factorise-trinomial`:

| Skill | Levels |
|---|---|
| `products-factors` | 1–2: binomial × trinomial (including $(x - 2)(x^2 + 2x + 4)$, where everything but the cubes cancels); 3: grouping in pairs ($x^3 + 2x^2 + 3x + 6$, $x^2 + 5xy + 3x + 15y$); 4: sums and differences of cubes ($27x^3 + 8$, $64 - x^3$, $a^3 - 8b^3$); 5: a common factor first ($2x^3 - 54$, $x^4 + 8x$), or grouping that leaves a difference of squares |
| `algebraic-fractions` | 1: cancel a common factor, or where a fraction is not defined; 2: trinomials top and bottom, and $\dfrac{x^2 - 9}{3 - x}$; 3: multiply and divide; 4: add and subtract (LCD from two brackets, or from a difference of squares, sometimes cancelling at the end); 5: denominators with cubes |

**Marking changes.**
- *Fully factorised* now accepts a quadratic factor with no rational roots (one variable, or two variables like $a^2 + 2ab + 4b^2$), so $(x - 3)(x^2 + 3x + 9)$ is right and $(x + 2)(x^2 - 9)$ is "not fully factorised". A whole-number common factor left inside any bracket still fails.
- Expressions are now compared as exact algebraic fractions: $\dfrac{a}{b} = \dfrac{c}{d}$ when $ad = bc$ as polynomials. Polynomial answers are unchanged.
- A new form, `simplified`: a polynomial, or one fraction (a whole factor in front is fine) whose top and bottom share no factor, found by a polynomial highest common factor. Retyping the question, leaving two fractions, or not cancelling are each marked as unsimplified, with the reason.
- The expression input takes `fraction` (a / key and a fraction placeholder) and `cubes` (a ³ key), and its "Reads as" preview is in display style, so a typed fraction looks like one.

**Predicted mistakes:** multiplying only some terms, the sign of the last product, a sign when taking out a negative in grouping, the cube factor's middle sign (same, opposite, always positive), $2ab$ instead of $ab$, $(a - b)^3$, cancelling terms, adding tops and bottoms, subtracting only part of a numerator, multiplying instead of dividing, and a numerator's zero given as a "not defined" value.

**Checked by value.** `algebra10.test.ts` turns each question's TeX into a function and compares at six points: answers must match, mistakes must not. Quadratic brackets in a factorised answer must have no rational roots (coefficients read off by evaluating), a fraction answer's top must not be 0 where its bottom is 0, and "not defined" answers must be exactly the zeros of the denominator from −40 to 40. Breaking the cube's middle sign, a grouping sign, a subtraction, a "not defined" value, or leaving an answer unsimplified each made the test fail.

**Labs.** `algebra-lab` has two modes: *grid* (the six products of $(x + p)(x^2 + qx + r)$ in a table, with like terms marked; choosing $q = -p$ and $r = p^2$ makes the $x^2$ and $x$ terms cancel, leaving a sum or difference of cubes) and *cancel* (put a value of $x$ into $\dfrac{x^2 + x - 6}{x^2 - 4}$, into $\dfrac{x + 3}{x + 2}$ and into the tempting $\dfrac{3}{2}$; the second matches everywhere except $x = 2$, and the wrong one agrees only at $x = 0$).

**New mistake codes:** `multiply-every-term`, `grouping`, `cube-factor`, `cancel-terms`, `fraction-lcd`, `subtract-numerator`, `divide-fraction`, `undefined-value`.

Rational and irrational numbers and rounding, the rest of this CAPS topic, are in §23.

## 23. Completing the square and real numbers (Paper 1)

Two skills (`math-squares-reals.ts`, lessons in `lessons-algebra10.ts`, two more `algebra-lab` modes). With them every Paper 1 topic is built.

| Skill | Grade | Levels |
|---|---|---|
| `real-numbers` | 10 | 1: rational or irrational ($\sqrt{39}$, $3{,}14$, $\tfrac{22}{7}$, $0{,}\dot{4}$, $\sqrt{2} \times \sqrt{8}$, $0{,}101001\ldots$); 2: between which two integers a square or cube root lies (and $-\sqrt{n}$); 3: rounding to 1–3 decimal places, some after a calculator step; 4: rounding to suit a situation (buses up, full egg boxes down); 5: recurring decimals as fractions in simplest form |
| `completing-square` | 11 | 1: $x^2 + bx + c$ as $(x + p)^2 + q$; 2: solving with whole-number roots; 3: surd roots in simplest form; 4: an odd $b$ (fractions) or $a \ne 1$ (divide first, then rationalise); 5: $a(x + p)^2 + q$ with $a \ne 1$, or the turning point |

**Two marking additions.**
- *Completed-square form* (`form: 'completed-square'`): one squared bracket whose $x$ has coefficient ±1, times a number, plus at most one number. $(x + 3)^2 - 7$ is right; the original quadratic, $(x + 3)^2 - 9 + 2$ or $2(x^2 - 6x + 9) - 13$ are equal but not in the form.
- *Surd roots* (`roots` with `surds` and `requireSimplest`): roots are compared as exact surds, a learner can type both at once as `-3 ± √7`, and a right value that isn't simplest ("Take the square factors out of √28") is marked as unsimplified. Rational roots work exactly as before. The roots input with `surds: true` has a √ key and a "Reads as" preview that shows the ± as two roots.

**Predicted mistakes:** adding the square instead of subtracting it, using $b$ instead of $\tfrac{b}{2}$, the sign in the bracket, the sign of the roots, dividing only the $x$ terms by $a$, forgetting to multiply the square by $a$, calling $3{,}14$ or a root irrational/rational the wrong way, cutting off instead of rounding, ordinary rounding in a situation that needs up or down, and writing $0{,}\dot{4}$ as $\tfrac{4}{10}$.

**Checked independently.** `squares-reals.test.ts` reads the quadratic from the prompt and requires each form to equal it at four points, each root to solve it (two distinct roots, square-free radicands), and the turning point to be at $-\tfrac{b}{2a}$. Rational or irrational is decided from the number's value (rational when a denominator up to 10 000 makes it whole) or its never-repeating pattern; roots are placed between the chosen integers; rounding, situation rounding and recurring decimals are recomputed from the prompt. Six deliberate errors (the square's constant, a root sign, not dividing by $a$, a root called rational, eggs rounded up, a mixed recurring decimal) each made it fail.

**Labs.** *square*: completing the square drawn literally. $x^2 + bx$ is a square and two strips of $\tfrac{b}{2}$, the dashed corner $(\tfrac{b}{2})^2$ completes it, and the equation updates with $b$ (odd $b$ gives fractions) and $c$. *decimals*: the digits of $\tfrac{1}{7}$, $\tfrac{5}{12}$, $\tfrac{3}{8}$, $\tfrac{7}{13}$, $\tfrac{22}{7}$, $\sqrt{2}$, $\sqrt{10}$ and $\pi$. Fractions come from long division with the repeating block highlighted, and roots are worked out exactly with whole-number arithmetic. $\tfrac{22}{7}$ and $\pi$ part ways after two decimal places.

**New mistake codes:** `rational-irrational`, `context-rounding`, `recurring-decimal`. `complete-square` and `rounding` existed and are reused.

## 24. Surface area and volume (Grade 10, Paper 2)

One skill, `surface-area-volume` (`math-measurement.ts`, `lessons-measurement.ts`, `MeasurementLabs.tsx`), on the CAPS Grade 10 list; Grade 11 revises it. With it, every Grades 10–12 Mathematics topic is built.

| Level | What it asks |
|---|---|
| 1 | Rectangular and right-triangular prisms, closed cylinders (radius or diameter given), and a cylinder's height from its volume |
| 2 | Spheres, solid hemispheres, cones (height or slant height given) |
| 3 | Right pyramids on a square or an equilateral-triangle base, the only bases CAPS allows |
| 4 | Multiplying dimensions by $k$: every length ($k^2$, $k^3$), only the radius ($k^2$) or only the height ($k$), and a new volume |
| 5 | Two solids joined (the guidelines' limit): a silo (cylinder + hemisphere), an ice-cream (cone + hemisphere), a pencil (cylinder + cone) |

**A new figure kind, `solid`.** Eleven shapes are drawn the way exam papers draw them: oblique, hidden edges dashed, the given measurements written on, and "Not drawn to scale" underneath (`SolidFigure.tsx`). A label left out is not drawn, so a "find the height" question shows *h*. Every figure has alt text. Slant heights come from Pythagorean triples, so given numbers are whole.

**Answers** are to two decimal places, accepted within 0,1%, so a learner who uses 3,14 for $\pi$ is still right.

**Predicted mistakes:** only three of a box's six faces, one triangular end, the diameter used as the radius, one circle on a closed cylinder, $r^2$ in a volume, a hemisphere without its flat face, a cone or pyramid without the ⅓, the height instead of the slant height, a pyramid without its base, the wrong power of $k$, and the hidden joining circle counted in a composite's surface. New mistake codes: `surface-area`, `one-third`, `slant-height`, `radius-diameter`, `scale-factor`, `composite-solid`.

**Checked from what the learner sees.** `measurement.test.ts` reads the lengths from the prompt and the shape from the figure, applies its own formula table (including Pythagoras for slant heights) and must match every answer at 400 seeds × 5 levels. Every predicted mistake must be off by more than 0,5%, and pyramid bases must be squares or equilateral triangles. Leaving out a cone's ⅓, a hemisphere's flat face, a pyramid's slant height, the $k^2$ for a radius, or counting a silo's hidden circle each made it fail.

**Labs.** `measure-lab` has two modes: *third* (pour cones of water into the cylinder with the same base and height; three fill it) and *scale* (a box and the same box with every length × $k$, its unit squares and cubes visible; a table shows area × $k^2$ and volume × $k^3$).

