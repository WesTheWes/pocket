# Pocket

Local-first web app for tracking progress learning songs (pop and jazz, piano-first). Users add songs, split them into sections, define a structure (play order), define goals per section (hands apart/together, voicings, BPM targets), run practice sessions that log progress, and see which songs are "learned". No accounts or backend; data lives in the browser (IndexedDB).

## Commands

- `npm run dev`: dev server
- `npm test`: Vitest, single run (`npm run test:watch` to watch)
- `npm run typecheck`: `tsc -b`
- `npm run lint`: Oxlint (not ESLint)
- `npm run format`: Prettier
- `npm run build`: typecheck + production build
- `npm run generate-pwa-assets`: regenerate the PWA icon PNGs from `public/icon-source.svg`. Run it whenever that source SVG changes.

Before calling work done, run typecheck, lint, and test.

## Stack

Vite, React 19, TypeScript, React Router, Tailwind v4, Dexie (+ `dexie-react-hooks`), Zod, React Hook Form, Vitest + Testing Library, vite-plugin-pwa. Playwright and Radix (for BottomSheet/ConfirmSheet) are the only stack items from the original plan still outstanding.

## PWA and deploy

- Deployed to GitHub Pages at `https://westhewes.github.io/pocket/` via `.github/workflows/deploy.yml` on every push to `main`. `vite.config.ts`'s `base` is `/pocket/` only when the workflow sets `GITHUB_PAGES=true`; local dev/build/preview stay at `/`. `src/App.tsx`'s router `basename` reads `import.meta.env.BASE_URL`, so it can never drift out of sync with `base` — never hardcode `/pocket/` anywhere else.
- GitHub Pages has no server-side rewrite, so a direct load or refresh of a deep route would 404. The deploy workflow copies `dist/index.html` to `dist/404.html` after the build; because this app uses real browser history (not hash routing), the address bar already shows the right URL when GitHub serves that 404 fallback, and the router just boots normally from it. Verified locally by serving `dist/` from a `/pocket/` subpath with a script that mimics this exact fallback (see the PR/commit that added this — no permanent script is kept in the repo).
- `vite-plugin-pwa` uses `registerType: 'prompt'`, deliberately not `'autoUpdate'`: Practice runs a live metronome and a ticking session timer, and a forced reload mid-session would be jarring. `src/app/PwaUpdater.tsx` (mounted in `RootLayout`, inside `ToastProvider`) lets a new version install and wait, and only mentions it via the toast once it has taken over.
- The manifest's icons come from `public/icon-source.svg` (a 512×512 master), rasterized by `@vite-pwa/assets-generator` (`pwa-assets.config.ts`, preset `'minimal-2023'` — note the hyphenated name; `minimal2023Preset` does not exist in the installed version) into `public/pwa-*.png`, `public/maskable-icon-512x512.png`, `public/apple-touch-icon-180x180.png` and `public/favicon.ico`. Edit the source SVG and rerun `npm run generate-pwa-assets` rather than hand-editing any PNG.
- Google Fonts (loaded from the CDN in `index.html`) are covered by `workbox.runtimeCaching` in `vite.config.ts`, so they survive offline after the first online load. A user who installs the app and goes offline before ever opening it online even once will see system fonts until they're next online — a real, undocumented-elsewhere limitation, not a bug.
- IndexedDB (Dexie) and `localStorage`/`sessionStorage` are unaffected by any of this: the service worker only intercepts `fetch` for static assets and the two Google Fonts hosts, never IndexedDB access, and both storage APIs are already origin-scoped (not path-scoped), so serving from `/pocket/` changes nothing about where existing data lives. This is also why the `pocket:` prefix on every localStorage/sessionStorage key matters: `westhewes.github.io` is one shared origin across any future project pages on the account.

## Design

The approved design is in docs/design/. Before building or changing UI, read
docs/design/README.md and SCREENS.md. The files in reference/screens/ are visual reference
only (canvas-format HTML that does not run): match their spacing, sizes and copy, do not copy markup.

- Tokens (colors, fonts, radii, the `desk` breakpoint) live in the `@theme` block in
  src/index.css. Use the generated utilities; never hard-code colors.
- Mobile first (designs are 390px wide). Every screen has a desktop layout at `desk:` (900px):
  Home, Song and Practice from the design; the rest follow the Song screen's conventions (`Page
wide`, 80px gutters, `TopBar` with a `backLabel`, which turns into the Song-style header row with
  the title as a big serif heading, two columns where it helps: forms put their long text on the
  right). Forms take a `wide` prop that only the screens pass, so the same form inside a sheet
  stays one column.
- Routes are in SCREENS.md and defined in src/app/routes.tsx; build links with `paths` from src/paths.ts. Screens live in their feature folder; shared UI in src/components.
- Every screen in the design is built: Home (features/repertoire); Song, New/Edit song, New/Edit section (features/songs); Structure editor (features/structure); Goals, New/Edit goal, Goal progress (features/goals); Practice and Review (features/session); Stats (features/stats, not in the original design). Unknown addresses show the NotFoundScreen in src/app.
- After UI changes, look at the running app (phone 390px and desktop 1280px) against docs/design/reference, not just the tests. jsdom applies no CSS, so it cannot catch layout bugs such as a `hidden` class losing to a component's own `inline-flex`. Wrap in a `hidden desk:block` container instead of passing `hidden` to a component.
- Drag and drop uses dnd-kit (handle-only pointer drag, plus keyboard: Space to lift, arrows, Space to drop). jsdom cannot drag, so test the pure logic in unit tests and verify dragging in a real browser.
- "Back" returns to where you came from. A screen that links to a page reachable from several places (Goal progress is opened from Goals, Practice and Review) passes `state={withReturn(path)}` on the link, and the target page uses `returnTarget(location.state, fallback)` for its back arrow and passes the state on to Edit goal. Opened directly, it falls back to its usual parent (`src/lib/returnTo.ts`). The same state can carry a tempo (`withReturn(path, { bpm })`, read with `tempoFrom`): Practice hands its metronome tempo to Goal progress, which starts the log form there instead of at the last logged tempo.
- Attempts logged from Goal progress pick up the song's open practice session (`repos.sessions.getActive`) at save time, so Practice can simply link to a goal's progress screen.
- Tap targets at least 44px, aria-label on icon-only buttons, aria-pressed on toggle chips.
  Quality is always shown as meter + color + label, never color alone.
- If the design docs or reference screens disagree with the Progress model or Architecture
  sections of this file, this file wins.

## Architecture rules

```
src/
  domain/      pure types + functions. No React, no Dexie.
  data/        Dexie schema + repositories. The ONLY code that imports Dexie.
  features/    songs, structure, goals, session, repertoire, backup, stats (one folder each)
  components/  shared UI primitives
  app/         router, layout, providers
```

- Features talk to storage through repositories in `src/data`, never Dexie directly.
- Derived values (goal mastery, section completion, song "learned" status) are computed by pure functions in `src/domain`, never stored.
- Sections are defined once; a song's `structure` is an ordered list of section IDs, so repeats are references, not copies.
- Zod schemas are the source of truth for data shapes and JSON import/export.
- Session elapsed time must derive from the stored `startedAt`, never `Date.now()` at component mount.
- Write domain tests first; domain code needs no mocks.
- src/features/session/metronome.ts is the only Web Audio code. Schedule beats with look-ahead on
  the AudioContext clock (never a bare setInterval), start it from a click handler, and dispose it
  on unmount. useMetronome wraps it.
- Session time is derived from the stored session (startedAt, pausedMs, pausedAt, endedAt) with
  the pure functions in src/domain/session.ts, never from state set at mount. useSessionTimer
  only re-renders on an interval.

## Data layer (src/data)

- `createRepositories({ db, now, newId })` builds one repository per record type. The clock and ID
  source are injected so tests are deterministic (`src/test/repos.ts` gives each test a fresh
  in-memory database, a manual clock and IDs like `id-1`). The app's instance is `repos` from
  `src/data`.
- Screens read through the hooks in `src/data/hooks.ts` (`useLiveQuery` wrappers) and write through
  `repos`. A hook returns `undefined` while loading; single-record hooks return `null` when the
  record does not exist.
- Repositories validate every write with the Zod schemas and enforce integrity and cascades inside
  transactions: deleting a section removes its goals, their attempts and its structure slots;
  deleting a song removes everything under it; deleting a goal removes its attempts and drops it
  from other goals' `requires` (so does deleting a section's goals). A goal may only require goals
  of its own song, never itself, and never in a circle (`RequirementCycleError`).
- `repos.sessions.startOrResume(songId)` is atomic; use it rather than checking then starting, so
  StrictMode's doubled effects cannot create two sessions.
- `repos.backup` has `exportAll`, `replaceAll` (validates first, then swaps in one transaction) and
  `clear`. Sample data comes from `createSeedData(now)` in `src/data/seed.ts`.
- The Dexie schema is at version 5 (v2: songs gained `tempo`, v3: attempts gained `note`, v4: goals gained `requires`, v5: songs and goals gained `resources`; each `upgrade` fills in the default). When a record shape changes, add a Dexie version with an upgrade and bump `BACKUP_VERSION` together, so stored data and old backup files both keep working.
- Never name an error `NotFoundError`: Dexie turns any error with that name thrown inside a
  transaction into its own `DexieError`. Ours is `RecordNotFoundError`.

## Practice (src/features/session)

- The metronome is split in two: `scheduler.ts` is pure look-ahead timing (a timer only wakes it; beats are placed on the audio clock, so they never drift) and `metronome.ts` is the thin Web Audio wrapper. Both are tested with fakes; `src/test/fakeAudio.ts` stubs `AudioContext` for screen tests.
- The metronome can click between beats: quarters, 8ths, triplets or 16ths (`Subdivision` in src/domain/subdivision.ts). The scheduler plays each beat as `accent`/`beat` and the clicks between as `sub` (lower, quieter, shorter), and only switches subdivision on a beat so the grid never lurches. `beatAt` still reports beats only. The choice is remembered in localStorage (`useStoredChoice`, key `pocket:metronome:subdivision`).
- `useMetronome` creates the metronome in an effect (not in render), so React StrictMode's extra mount cannot leave a disposed one.
- `useSessionTimer` reads the clock through `useSyncExternalStore` and derives time from the stored session. It ticks in 250 ms steps, so it can read a hair behind real time.
- An open session older than 12 hours (`isSessionStale`) is treated as abandoned: `startOrResume` ends it and starts a fresh one, and `getActive` ignores it.
- Practice has no page for adding or editing goals: the pencil and "Add goal" on the goal card open `GoalSheet` (the same `GoalForm`) over the screen, so the metronome and timer keep running. The current section's goals are listed under the chips (phones), so you never have to page through them. On phones the metronome's play button is `fixed` to the bottom bar (the bar leaves a gap for it) so it stays reachable however tall the screen gets; on desktop it sits in the panel.
- Practice shows a minimizable Notes panel (`PracticeNotes`) between the goal card and the metronome: the current section's notes and the song's chord chart, as tabs that only exist when there is something to show. The open/minimized choice is remembered in localStorage (`useStoredFlag`). The chord chart never wraps (`whitespace-pre!`), so its columns line up.
- A `className` passed to `TextAreaField` replaces its default height and font (they are one setting), rather than stacking on them.
- Confirmations use the app-wide toast: call `useToast().notify(message)` (from `components/toastContext`). `ToastProvider` sits in `RootLayout`, above every screen, so a message survives navigation. It hides itself after ~3 s. Saving a new attempt that you logged from Practice navigates straight back to the session (`practiceReturn`); from anywhere else it stays on Goal progress.
- Editing from Practice: the ⋯ button beside the song picker opens `EditMenuSheet` (song details, the current section, add a section, play order). Each opens the regular form in a sheet (`EditSheets.tsx`), so the metronome and timer keep running. `StructureEditor` is the shared body of the Structure screen and the Play order sheet; `GoalStatus` is the shared "percent or Done" used by both Practice goal lists.
- Practice remembers the tempo you set for each goal for the rest of the session (`tempoMemory.ts`, in sessionStorage so it survives a trip to Log attempt and a reload). A tempo logged after you set it wins (`chooseTempo`).
- The current goal lives in the URL (`?goal=`) so a reload keeps your place. Landing on a goal resets the tempo to `startingBpm`.
- Practice is one DOM that adapts with `desk:` classes (CSS `order` moves Finish and the timer), so each control exists once.

## Gamification (src/domain/week.ts, levels.ts, suggest.ts)

- Practice should feel like levels with a clear place to start. Everything derives from stored
  data; nothing new is saved. `week.ts`: `weekDays` (Monday-first, by local day), `streakDays`
  (days in a row up to today; a streak survives until the end of today). `levels.ts`: a goal's
  level is its depth in the `requires` graph (`goalLevels`, `songLevels`, `currentLevel`).
  `suggest.ts`: `suggestGoal` (the song practised last, its first goal neither done nor locked),
  `nextStep` (two Solid at a tempo → +4, never past the target; one Solid → again; a miss → −4),
  `goalReason`, `unlockedBy`, `openGoals`.
- Home shows `WeekStrip`, `StartHere` (links to Practice with `withReturn(home, { bpm })`;
  Practice lands on `tempoFrom(location.state)`) and `OpenGoals`. Celebration is understated:
  yellow, rings, serif; no confetti, emoji or points.
- Practice's goal card adds "N to go", a Next step box (`nextStep`, with a one-tap Set), "Finishing
  this opens" chips (`unlockedBy`), a "N Solid in a row" chip (`solidRun`, src/domain/celebrate.ts)
  and "PB" beside BPM. `UnlockSheet` (src/features/session) celebrates a goal an attempt just
  finished: `AttemptForm.onLogged(attempt)` lets Goal progress tell; from Practice it navigates back
  with `{ celebrate: goalId }` (read by `celebrationFrom`) and Practice shows the sheet, clearing the
  state on close; elsewhere Goal progress shows it.
- Review adds "Today's firsts" (`sessionFirsts` in src/domain/firsts.ts: goal done, first or new
  fastest Solid, level reached with how many goals opened, longest session in 30 days, streak
  kept; at most four) and "Next time, start with" (`suggestGoal` for the song).

## Song plans (src/domain/songPlan.ts, src/features/songs/PlanSongScreen.tsx)

- "Plan a song" (`/songs/plan`, linked from Home and New song) creates a whole song from a plan an
  assistant wrote, without the app talking to one: describe the song, what it is for and your level;
  `buildPlanPrompt` makes the prompt to copy into any assistant; paste the reply; check the preview;
  Create. The prompt asks for exactly what `parseSongPlan` reads.
- A plan (`songPlanSchema`) is plain JSON in words a person could write: the song, sections with
  notes and goals, the play order by section name, whole-song goals, and goals' "finish first" by
  goal **title** (unique within the plan), plus links. `parseSongPlan` never throws, tolerates
  fences and chatter around the JSON, and checks the pieces fit (play order names real sections,
  no circular requirements). `planToRecords` is pure; `repos.songs.createFromPlan` writes the song,
  sections and goals in one transaction.
- Songs and goals carry `resources` (label, http(s) URL, kind: video, lesson, exercise, other),
  edited with `LinksField` in the song and goal forms and shown by `ResourceLinks` on Song and
  Goal progress (new tab, `rel="noreferrer"`).
- Nothing calls a model yet. The next step (an API key or a proxy) is deliberately not built.

## Backup (src/features/backup, src/domain/backup.ts)

- A backup is one JSON file: `{ app: "pocket", version, exportedAt, data }` (`createBackup` / `serializeBackup`). Bump `BACKUP_VERSION` when the shape of `data` changes and teach `parseBackup` to upgrade older files.
- `parseBackup` never throws; a bad file comes back with a plain-language reason. Besides the Zod shape it runs `checkIntegrity` (every reference points at a real record). `repos.backup.replaceAll` and `addMissing` run the same checks, so a damaged file cannot be written.
- Restore has two modes: `addMissing` (adds songs the device lacks, whole; never touches a song already there; all or nothing) and `replaceAll` (behind a confirmation).
- The Backup screen is at `/backup`, linked from the bottom of Home. It records the last export date in localStorage.
- Tests use `configure({ asyncUtilTimeout: 4000 })` (src/test/setup.ts) because hundreds of IndexedDB-backed tests share the CPU. If a test fails only in the full run, suspect a race, not the timeout.

## Progress model

- Quality levels are stored as numbers 1-5: Can't play at all, Many mistakes, Few mistakes, Solid,
  Perfection. Labels live in one constant in src/domain/quality.ts.
- Each attempt logs an optional BPM, a level and an optional note (what went wrong, what to try next; `''` when none), and may carry a sessionId. Notes show on history rows, Review's Worked-on cards (every note from the session) and Practice's goal card (the latest note for the goal, `latestNote` in src/domain/notes.ts, with its age).
- A song has an optional tempo (`Song.tempo`, null when not set). New goals, from New goal or Practice's goal sheet, start their target BPM at it (`newGoalTargetBpm`), else 80.
- A goal has an optional, always-editable target BPM. There is no per-goal target level: every goal
  is measured against Solid (4).
- A goal is done when some attempt at Solid or better reaches the target BPM (with no target BPM,
  any Solid or better attempt). Attempts rated Can't play at all never count.
- Goal progress = fastest BPM logged at Solid or better / target BPM, capped at 1. Section progress
  and song progress are the average of their goals' progress (whole-song goals count toward the
  song). All of this is derived in src/domain/progress.ts, never stored.
- Goal cards show progress ("fastest Solid 72 of 84"), not a standalone rating. Levels appear on
  individual attempts: history rows, the log form, the session review.
- A goal can list other goals of its song to finish first (`Goal.requires`). It is a **soft lock**:
  a way to give a long goal list a shape, like levels, never a rule. A goal is locked while it is
  not done and something it requires is not done (`goalLocked`, `blockingGoals`, `lockReason` in
  src/domain/progress.ts; the graph helpers `wouldCycle`, `requirementCycles`, `lockText` in
  src/domain/prerequisites.ts). Locked goals still take attempts and count toward progress exactly
  as before. `orderGoals` places a goal after what it requires, and `firstUnfinishedGoal` (Home's
  play button, Practice's start) skips locked goals. The UI shows a lock icon with "Finish X first".
- A song is "Learned" when every goal is done, with a manual override. The Home filter the design
  calls "Mastered" is "Learned".
- Practice review compares each goal's progress before the session with progress after it, using
  the attempts tagged with that sessionId (`sessionChanges`, `songProgressChange`), and charts it
  with `ProgressChange` rows. Its Worked-on cards instead compare the goal's last attempt before
  the session with its last one in it (tempo and quality), noting the earlier one's age when it is
  over 14 days older than the session.
- Review also charts the song's progress over every finished session (`progressHistory` in
  src/domain/history.ts: a point before the first session, then one after each; practice outside
  sessions folds into the next point) and each worked-on goal's tempos within the session. Both
  charts are hand-drawn SVG in src/components (no chart library), labelled in words and backed by a
  hidden list, so nothing depends on colour or the picture.
- Stats (`/stats`) derives everything with src/domain/stats.ts: `recentImprovements` (goals whose
  progress rose in a session in the last 30 days, at most 10) and `practiceTimeSince` (last 7
  days). Attempts logged outside a session never appear under "Improved lately".

## Conventions

- `erasableSyntaxOnly` is on: no TS enums or constructor parameter properties. Use string unions.
- Prettier style: no semicolons, single quotes, trailing commas, 100 columns.
- Mobile-first layouts with large tap targets; support dark mode.
- Small commits, one per milestone or logical step.
