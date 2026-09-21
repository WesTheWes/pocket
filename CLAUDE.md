# Pocket

Local-first web app for tracking progress learning songs (pop and jazz, piano-first). Users add songs, split them into sections, define a structure (play order), define goals per section (hands apart/together, voicings, BPM targets), run practice sessions that log progress, and see which songs are "learned". No accounts or backend; data lives in the browser (IndexedDB).

## Commands

- `npm run dev`: dev server
- `npm test`: Vitest, single run (`npm run test:watch` to watch)
- `npm run typecheck`: `tsc -b`
- `npm run lint`: Oxlint (not ESLint)
- `npm run format`: Prettier
- `npm run build`: typecheck + production build

Before calling work done, run typecheck, lint, and test.

## Stack

Vite, React 19, TypeScript, React Router, Tailwind v4, Dexie (+ `dexie-react-hooks`), Zod, React Hook Form, Vitest + Testing Library. Playwright, Radix, and `vite-plugin-pwa` are planned but not yet installed.

## Design

The approved design is in docs/design/. Before building or changing UI, read
docs/design/README.md and SCREENS.md. The files in reference/screens/ are visual reference
only (canvas-format HTML that does not run): match their spacing, sizes and copy, do not copy markup.

- Tokens (colors, fonts, radii, the `desk` breakpoint) live in the `@theme` block in
  src/index.css. Use the generated utilities; never hard-code colors.
- Mobile first (designs are 390px wide). Home, Song and Practice get desktop layouts at `desk:`
  (900px). Every other screen stays a centered ~480px column.
- Routes are in SCREENS.md and defined in src/app/routes.tsx; build links with `paths` from src/paths.ts. Screens live in their feature folder; shared UI in src/components.
- Every screen in the design is built: Home (features/repertoire); Song, New/Edit song, New/Edit section (features/songs); Structure editor (features/structure); Goals, New/Edit goal, Goal progress (features/goals); Practice and Review (features/session). Unknown addresses show the NotFoundScreen in src/app.
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
  features/    songs, structure, goals, session, repertoire (one folder each)
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
  deleting a song removes everything under it; deleting a goal removes its attempts.
- `repos.sessions.startOrResume(songId)` is atomic; use it rather than checking then starting, so
  StrictMode's doubled effects cannot create two sessions.
- `repos.backup` has `exportAll`, `replaceAll` (validates first, then swaps in one transaction) and
  `clear`. Sample data comes from `createSeedData(now)` in `src/data/seed.ts`.
- Never name an error `NotFoundError`: Dexie turns any error with that name thrown inside a
  transaction into its own `DexieError`. Ours is `RecordNotFoundError`.

## Practice (src/features/session)

- The metronome is split in two: `scheduler.ts` is pure look-ahead timing (a timer only wakes it; beats are placed on the audio clock, so they never drift) and `metronome.ts` is the thin Web Audio wrapper. Both are tested with fakes; `src/test/fakeAudio.ts` stubs `AudioContext` for screen tests.
- `useMetronome` creates the metronome in an effect (not in render), so React StrictMode's extra mount cannot leave a disposed one.
- `useSessionTimer` reads the clock through `useSyncExternalStore` and derives time from the stored session. It ticks in 250 ms steps, so it can read a hair behind real time.
- An open session older than 12 hours (`isSessionStale`) is treated as abandoned: `startOrResume` ends it and starts a fresh one, and `getActive` ignores it.
- Practice has no page for adding or editing goals: the pencil and "Add goal" on the goal card open `GoalSheet` (the same `GoalForm`) over the screen, so the metronome and timer keep running. The current section's goals are listed under the chips (phones), so you never have to page through them. On phones the metronome's play button is `fixed` to the bottom bar (the bar leaves a gap for it) so it stays reachable however tall the screen gets; on desktop it sits in the panel.
- Practice shows a minimizable Notes panel (`PracticeNotes`) between the goal card and the metronome: the current section's notes and the song's chord chart, as tabs that only exist when there is something to show. The open/minimized choice is remembered in localStorage (`useStoredFlag`). The chord chart never wraps (`whitespace-pre!`), so its columns line up.
- A `className` passed to `TextAreaField` replaces its default height and font (they are one setting), rather than stacking on them.
- Practice remembers the tempo you set for each goal for the rest of the session (`tempoMemory.ts`, in sessionStorage so it survives a trip to Log attempt and a reload). A tempo logged after you set it wins (`chooseTempo`).
- The current goal lives in the URL (`?goal=`) so a reload keeps your place. Landing on a goal resets the tempo to `startingBpm`.
- Practice is one DOM that adapts with `desk:` classes (CSS `order` moves Finish and the timer), so each control exists once.

## Progress model

- Quality levels are stored as numbers 1-5: Can't yet, Rough, Shaky, Solid, Mastered. Labels live
  in one constant in src/domain/quality.ts.
- Each attempt logs an optional BPM and a level, and may carry a sessionId.
- A goal has an optional, always-editable target BPM. There is no per-goal target level: every goal
  is measured against Solid (4).
- A goal is done when some attempt at Solid or better reaches the target BPM (with no target BPM,
  any Solid or better attempt). Attempts rated Can't yet never count.
- Goal progress = fastest BPM logged at Solid or better / target BPM, capped at 1. Section progress
  and song progress are the average of their goals' progress (whole-song goals count toward the
  song). All of this is derived in src/domain/progress.ts, never stored.
- Goal cards show progress ("fastest Solid 72 of 84"), not a standalone rating. Levels appear on
  individual attempts: history rows, the log form, the session review.
- A song is "Learned" when every goal is done, with a manual override. The Home filter the design
  calls "Mastered" is "Learned".
- Practice review compares each goal's progress before the session with progress after it, using
  the attempts tagged with that sessionId.

## Conventions

- `erasableSyntaxOnly` is on: no TS enums or constructor parameter properties. Use string unions.
- Prettier style: no semicolons, single quotes, trailing commas, 100 columns.
- Mobile-first layouts with large tap targets; support dark mode.
- Small commits, one per milestone or logical step.
