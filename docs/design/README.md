# Pocket: design

Pocket is a mobile-first, responsive web app for tracking the songs you are practicing. You store songs, break each into sections, set goals (a target tempo per section or for the whole song), log attempts against those goals, and practice with a built-in metronome and timer.

This folder is the approved design. The rules for the data model, progress math, stack and conventions live in `CLAUDE.md` at the repo root, and `CLAUDE.md` wins if anything here disagrees with it.

```
docs/design/
  README.md              this file: look and feel, behavior, layout, build order
  SCREENS.md             every screen: route, feature folder, contents, components
  design-tokens.css      the original tokens, kept as reference (the app uses src/index.css)
  reference/screens/     the 19 design screens as HTML (visual reference only, see below)
```

## Reference screens: what is out of date

The `.dc.html` files come from the design canvas. They use a canvas-specific format (`<x-dc>`, `{{ }}` holes, and a runtime that is not included), so they do not run. Read them for exact values: every style is inline, so paddings, sizes, colors, copy and states are all visible. `reference/screens/canvas.json` lists the titles and layout of the whole canvas.

The screens were drawn before the progress model in `CLAUDE.md` was settled, so they differ from it in these ways. **`SCREENS.md` and `CLAUDE.md` win over the reference screens.**

- **Quality labels.** The screens say "Can't play at all / Lots of mistakes / Some mistakes / Solid / Mastered". Use `QUALITY_LABELS` from `src/domain/quality.ts` (Can't play at all / Many mistakes / Few mistakes / Solid / Perfection).
- **Goal cards show progress, not a rating.** The screens show a five-segment quality meter and a quality name on goal cards (Goals, Practice, Goal progress summary). Build a progress bar with "fastest Solid 72 of 84 BPM" instead. The quality meter appears only on individual attempts.
- **Percentages.** The screens use a different formula (latest tempo and latest quality averaged). Use `src/domain/progress.ts`. The numbers in `src/data/seed.ts` are the ones the built app should show (Piano Man 68%, 3 of 8 goals done).
- **"Mastered" filter on Home** is "Learned".
- **Tempo is optional.** The goal form and the log form show a tempo stepper only. Add a small "No tempo" toggle under each that clears the value.
- **Review** shows quality before and after per goal in the screens. Build it as described in `SCREENS.md`.

Copy: the code and `CLAUDE.md` say "attempt". The screens say "entry" and "progress" in places ("Log progress", "Save entry"). Prefer "Log attempt" and "Save attempt" in the UI so the words match.

## Look and feel

Minimalist, dark, warm. A near-black warm background, cream text, and warm highlights: orange for the primary action and progress bars, yellow for "done" and the focus ring, pink and rose at the low end of the quality scale.

- Type: Instrument Serif (`font-display`) for titles and big numbers (song titles, the BPM readout), DM Sans for everything else, a system monospace for chord notes (`chord-notes`).
- Shapes: pill buttons and chips (`rounded-full`), 14 to 20px radii (`rounded-field`, `rounded-row`, `rounded-card`), generous spacing, no borders on cards (surface color separates them).
- Touch targets are at least 44px. Every icon-only button has an `aria-label`. Toggle chips use `aria-pressed`.
- No emoji, no gradients, no status-bar imitations.

Quality is always shown three ways: a five-segment meter, its color (`q1` to `q5`), and the written level. Never rely on color alone.

## Practice screen behavior

- The header shows the song with a picker to switch songs, and a Finish button that ends the session and opens Review.
- A timer counts practice time (mm:ss, then h:mm:ss) and can be paused. Starting Practice creates a session (`startSession`); the timer is `useSessionTimer(session)`, derived from the stored session, so a reload keeps the time. Switching songs finishes the current session and starts a new one.
- The section chips each carry a progress bar (the section's progress) so you can see what needs work. Tapping a chip jumps to that section's first goal. A "Whole song" chip covers whole-song goals.
- The goal card shows the section, goal position ("Goal 3 of 8"), title, description, a lock icon with "Finish X first" while the goal is locked (soft: you can still log attempts), a progress bar with "fastest Solid 72 of 84 BPM" and "· 12 to go" in yellow, under it the latest note written for the goal ("Last note · 2 days ago …"), then a **Next step** box (`nextStep`: "Two Solid at 76. Try 80." with a "Set 80" button that sets the metronome; hidden once the goal is done) and **Finishing this opens** chips (`unlockedBy`). A "Log attempt" link opens the goal's progress screen. Beside the timer, "2 Solid in a row" appears after two Solid attempts in a row this session (`solidRun`); the BPM readout notes the personal best ("BPM · PB 76").
- An attempt that finishes a goal opens the **unlock sheet** (`UnlockSheet`): a check in rings, "Goal done", the title, the story ("Solid at 84 BPM, on your 9th attempt. Up from 60 three weeks ago."), three figures (BPM gained or attempts, goals done, the song's level), the goals that just opened with play buttons, "Next: …" (jumps to the first of them) and "Stay on this one", and your last note. Logged from Practice, Log attempt hands it over with `{ celebrate: goalId }` in the location state and Practice shows it; logged on Goal progress directly, it shows there and "Next" opens Practice.
- Previous and next buttons move through goals (`orderGoals`: a goal comes after the goals it requires). Opened without a goal, Practice starts at `firstUnfinishedGoal`, which skips locked goals. Landing on a goal sets the metronome to `startingBpm(goal, attempts)`: the last tempo logged, else the target, else 80.
- The metronome has play and pause, minus and plus buttons, a slider (40 to 200 BPM; the buttons and `setBpm` allow 30 to 240), a big BPM readout, four beat dots that pulse in time with an accented downbeat, and a volume slider (speaker icon, 0 to 100%, remembered). It clicks. Use `useMetronome`. Start it from the play button's click handler so the browser allows audio.
- Attempts logged during a session carry its `sessionId`.

## Responsive layout

Build mobile first (the mockups are 390px wide), then add the desktop layouts at the `desk:` breakpoint (900px) and up:

- Home: 3-column grid of song cards, plus a dashed "New song" tile. Search sits in the header next to the New song button.
- Song: two columns. Title, progress, actions and sections on the left; structure and chord notes on the right.
- Practice: a fixed left panel (song picker, timer, full goal list, Finish) and a main area (section chips, goal card, metronome panel, previous and next).
- Goals: the groups in two columns. Goal progress: title, summary, log form on the left; history on the right. Review: time, counts, the over-time chart and the buttons on the left; progress rows and worked-on cards on the right. Stats: figures in a row, then Improved lately beside Your songs.
- Forms (song, section, goal) and Structure: two columns, with the long part on the right (the chord chart; a section's notes; a goal's description and "Finish first"; the "Add to structure" chips). The same forms inside a Practice sheet stay one column. Backup: one wider centred column.
- The top bar becomes the Song screen's header row at desktop: a back link with the parent's name, the action on the right, and the screen title as a large serif heading below.

## Suggested build order

1. Tokens (`src/index.css`) and the shared components in `SCREENS.md`, with routes in `src/app`.
2. Dexie tables, repositories and a dev-only "Load sample data" action that imports `seedData`. Screens read with `useLiveQuery` and pass plain arrays to the functions in `src/domain/progress.ts`.
3. Home and Song, with song create, edit and delete (`repertoire`, `songs`).
4. Sections and structure editing (`songs`, `structure`).
5. Goals: list, create, edit, delete, and attempt logging (`goals`).
6. Practice with the metronome and timer, then Review and saving sessions (`session`).
7. Desktop layouts, search, sort and filters, empty states.

## Not designed yet

These were left open. Decide them before building or leave them out of the first version:

- What the play button on each Home card does. Suggested: `firstUnfinishedGoal` decides the goal, then open `/practice/:songId?goal=<goalId>` at it (or at the first goal when every goal is done).
- Home filters and sort. The chips are All, In progress and Learned, matching `songStatus`. Sort options: recently practiced, title, progress.
- Empty states (no songs, no sections, no goals, no attempts).
- Deleting a structure slot or an attempt has no confirmation in the design.
- The manual "Learned" override needs a control (suggested: a toggle on Edit song).
- Cross-song goals view (considered and cut for now).
- Sample data for songs other than Piano Man is illustrative only.
