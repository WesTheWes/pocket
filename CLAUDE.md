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
- Built so far: Home (features/repertoire); Song, New/Edit song, New/Edit section (features/songs); Structure editor (features/structure); Goals list, New/Edit goal, Goal progress with attempt logging (features/goals). Still `ComingSoon` placeholders in src/app/routes.tsx: Practice and Practice review.
- After UI changes, look at the running app (phone 390px and desktop 1280px) against docs/design/reference, not just the tests. jsdom applies no CSS, so it cannot catch layout bugs such as a `hidden` class losing to a component's own `inline-flex`. Wrap in a `hidden desk:block` container instead of passing `hidden` to a component.
- Drag and drop uses dnd-kit (handle-only pointer drag, plus keyboard: Space to lift, arrows, Space to drop). jsdom cannot drag, so test the pure logic in unit tests and verify dragging in a real browser.
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
