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

## Conventions

- `erasableSyntaxOnly` is on: no TS enums or constructor parameter properties. Use string unions.
- Prettier style: no semicolons, single quotes, trailing commas, 100 columns.
- Mobile-first layouts with large tap targets; support dark mode.
- Small commits, one per milestone or logical step.
