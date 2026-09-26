# Screens

Each row maps a design screen to a route and a feature folder. The reference file is in `reference/screens/` (see the README for what is out of date in them). Mobile is the base layout; desktop notes are called out where they differ. All screens are dark and use the tokens in `src/index.css`.

## Routes

| Screen          | Route                                 | Feature      | Reference file                                |
| --------------- | ------------------------------------- | ------------ | --------------------------------------------- |
| Home            | `/`                                   | `repertoire` | `Main.dc.html`, `DesktopHome.dc.html`         |
| New song        | `/songs/new`                          | `songs`      | `NewSong.dc.html`                             |
| Song            | `/songs/:songId`                      | `songs`      | `Song.dc.html`, `DesktopSong.dc.html`         |
| Edit song       | `/songs/:songId/edit`                 | `songs`      | `EditSong.dc.html`                            |
| New section     | `/songs/:songId/sections/new`         | `songs`      | `NewSection.dc.html`                          |
| Edit section    | `/songs/:songId/sections/:sectionId`  | `songs`      | `EditSection.dc.html`                         |
| Structure       | `/songs/:songId/structure`            | `structure`  | `Structure.dc.html`                           |
| Goals           | `/songs/:songId/goals`                | `goals`      | `Goals.dc.html`                               |
| New goal        | `/songs/:songId/goals/new`            | `goals`      | `NewGoal.dc.html`                             |
| Edit goal       | `/songs/:songId/goals/:goalId/edit`   | `goals`      | `EditGoal.dc.html`                            |
| Goal progress   | `/songs/:songId/goals/:goalId`        | `goals`      | `GoalProgress.dc.html`                        |
| Practice        | `/practice/:songId`                   | `session`    | `Practice.dc.html`, `DesktopPractice.dc.html` |
| Practice review | `/practice/:songId/review/:sessionId` | `session`    | `Review.dc.html`                              |
| Stats           | `/stats`                              | `stats`      | (no reference screen; mockup in the PR)       |

Delete confirmations (`DeleteSong`, `DeleteSection`, `DeleteGoal`) are not routes. Build one `ConfirmSheet` (a bottom sheet over the edit screen, with a scrim) and open it from the Delete button on the edit screens. On desktop, center it instead of anchoring it to the bottom.

New-goal from a section header (the plus next to a section name on the Goals screen) should preselect that section.

Forms use React Hook Form with the Zod schemas from `src/domain/schemas.ts`. Screens read data with `useLiveQuery` through repositories and never import Dexie.

## Home

Wordmark "Pocket", search field, filter chips (All, In progress, Learned), a count with a sort control, then song cards. Each card: title (serif), artist, a progress bar with a percentage (`averageProgress` over the song's goals), and a round play button (quick practice, see "Not designed yet" in the README). Tapping the card opens Song. A full-width "New song" button is pinned to the bottom on mobile. A Learned song shows a yellow "Learned" tag in place of the percentage.

## Song

Back and edit buttons, title, artist, overall progress bar with "3 of 8 goals done" (`doneCount`), then two buttons: Practice (primary) and Goals. Below: Sections (each row: name, goal count and done count, progress bar and percentage, chevron; an "Add" link), Structure (the ordered section names as small chips, with an "Edit" link), and Chord notes (monospace card, tapping opens Edit song).

## Edit song, New song

Fields: Title, Artist, Chord notes (large monospace textarea). New shows "Create song". Edit shows "Save changes" and a pink outlined "Delete song" button that opens the confirm sheet.

## Edit section, New section

Name field with preset chips underneath (Intro, Verse, Pre-chorus, Chorus, Bridge, Solo, Outro) that fill the name. Notes textarea. Edit also lists the section's goals (with an Add link) and has a Delete section button.

## Structure

The ordered list of slots: drag handle, position number, section name, remove button. Reordering by drag (use pointer events or a small library such as dnd-kit, and give keyboard users up and down controls). Below, "Add to structure" chips append a section. A section may appear more than once. Save returns to Song.

## Goals

Title area with the song name, filter chips (All, To do, Done, with counts), then goals grouped under Whole song and then each section in song order. Group headers have a count and a plus button that starts a new goal in that group.

Each goal card: the title, an orange progress bar (`goalProgress`), and one line of text under it: "fastest Solid 72 of 84 BPM", or "No Solid attempt yet" when there is none, or "Solid attempt logged" for a goal with no target tempo. A yellow "Done" check appears on done goals. **There is no quality meter or quality name on the card.** Tapping a goal opens Goal progress.

## New goal, Edit goal

"Applies to" chips (Whole song and each section), Title, Description, Target tempo (a stepper with minus and plus around a big number, 30 to 240, with a "No target tempo" toggle that clears it), and Save. Edit adds Delete goal. There is no target-level field: every goal is measured against Solid.

## Goal progress

Section label, goal title, description. A summary card: the progress bar with "fastest Solid 72 of 84 BPM" and a "Done" state. A "Log attempt" card: tempo stepper (with a "No tempo" toggle), five quality options as selectable rows (each with a mini meter, the label, and a check on the selected one), and "Save attempt". Below, History: newest first, each row with date, BPM (or "no tempo") and quality (meter, color and label), and edit and delete icon buttons. An edit button in the top bar opens Edit goal.

## Practice

See "Practice screen behavior" in the README. Mobile: header (song picker, Finish), timer with pause, section chips in a 3-column grid with progress bars, goal card, metronome (beat dots, BPM readout with minus and plus, slider, big play and pause button), and previous and next goal buttons pinned to the bottom. The song picker is a bottom sheet listing songs.

Desktop: left panel with the back link, song picker, timer, the full goal list (section label and title, the current goal highlighted), and Finish. The main area holds the section chips (with progress bars in a row), a larger goal card, and a horizontal metronome panel.

## Practice review

Shown after Finish. Total time (large serif, `sessionElapsedMs`), song, and two counts: goals worked and goals improved (`sessionChanges`).

**Progress**: a card of before/after rows (`ProgressChange`, with a Before/After legend): first "Whole song · Overall progress · every goal" (`songProgressChange`), then one row per goal worked on (`progressBefore` / `progressAfter`). Each row: "45% → 61%" and a track with a hollow dot (before), a filled orange dot (after) and a line between; one muted dot when unchanged.

**Worked on**: one card per goal with attempts in this session: section, title, edit button (opens Goal progress), then Tempo and Quality comparing the goal's last attempt before the session with its last attempt in it ("54 → 60 BPM", "Rough → Shaky"; just the session value when there was nothing before), a quality meter of the last attempt with the Solid segment outlined, "Last time: 3 months ago" when the earlier attempt is over 14 days older than the session, and a change tag (`changeTag` in `reviewText.ts`): "Done", what went up ("+6 BPM · quality up"), "Fastest Solid now 76 BPM", what went down (muted), or "No change".

Buttons side by side: "Practice again" (secondary) and "Done" (primary, back to Home).

## Stats

Opened from the chart icon in the Home header and the "Stats" link beside "Back up & restore". Back arrow, "Stats" (serif) and "Your practice, at a glance". Three figures: Songs, Goals done (`doneCount` over every goal), This week (practice time in sessions started in the last 7 days, `practiceTimeSince`). **Improved lately**: `ProgressChange` rows for each goal whose progress rose in a session in the last 30 days (`recentImprovements`, at most 10, newest first), with "SONG · SECTION" and "4 days ago". **Your songs**: every song, recently practiced first, with percent, status (Learned, In progress, or Not started when no attempts) and a progress bar; each row opens Song.

## Component list

Build these once in `src/components` and reuse them:

- `TopBar` (back, centered title, right-hand action)
- `Button` (primary, secondary, danger), `IconButton` (44px, always with `aria-label`)
- `Chip` (selectable, with an optional progress bar for Practice sections)
- `ProgressBar` (orange fill)
- `QualityMeter` (five segments) and `QualityPicker`, used for attempts only
- `Stepper` (minus, big number, plus, optional "no value" toggle)
- `Field` and `TextArea` (label above, filled surface)
- `SongCard`, `SectionRow`, `GoalCard`, `AttemptRow`, `WorkedOnCard`
- `BottomSheet` (delete confirm, song picker) and `ConfirmSheet`
- `MetronomePanel` and `BeatDots`
