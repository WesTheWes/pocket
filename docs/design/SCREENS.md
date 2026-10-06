# Screens

Each row maps a design screen to a route and a feature folder. The reference file is in `reference/screens/` (see the README for what is out of date in them). Mobile is the base layout; desktop notes are called out where they differ (and the README's "Responsive layout" lists every desktop layout). All screens are dark and use the tokens in `src/index.css`.

## Routes

| Screen          | Route                                 | Feature      | Reference file                                |
| --------------- | ------------------------------------- | ------------ | --------------------------------------------- |
| Home            | `/`                                   | `repertoire` | `Main.dc.html`, `DesktopHome.dc.html`         |
| New song        | `/songs/new`                          | `songs`      | `NewSong.dc.html`                             |
| Plan a song     | `/songs/plan`                         | `songs`      | (no reference screen)                         |
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

Wordmark "Pocket", search field, then (when there are songs) **This week**: a dot per day Monday to Sunday (orange when practised, a yellow ring for today, a faint ring otherwise) with the week's minutes and "3 days · 4-day streak" (`weekDays`, `streakDays` in src/domain/week.ts); **Start here**: one goal to start on (`suggestGoal` in src/domain/suggest.ts: the song practised last, its first goal that is neither done nor locked) with song and section, title, progress bar, where it stands ("fastest Solid 76 of 84 BPM · 8 to go"), the last note, the next step ("Two Solid at 76. Try 80.") and what finishing it opens, and a "Start at 80 BPM" button that opens Practice at that tempo; and **Open, not started** (`openGoals`): up to three goals whose requirements are all done but that were never tried, each with a play button. Then filter chips (All, In progress, Learned), a count with a sort control, then song cards. Each card: title (serif), artist, a progress bar with a percentage (`averageProgress` over the song's goals), and a round play button (quick practice, see "Not designed yet" in the README). Tapping the card opens Song. A full-width "New song" button is pinned to the bottom on mobile. A Learned song shows a yellow "Learned" tag in place of the percentage.

## Plan a song

Opened from "Plan a song" at the bottom of Home and the line under the New song form. Four numbered steps, two columns on desktop: (1) Describe the song: Title, Artist, "What are you learning it for?", level chips (Beginner, Intermediate, Advanced). (2) Ask an assistant: a "Copy prompt" button (disabled until there is a title; toast "Prompt copied") and a collapsed "Show the prompt" with the prompt in a read-only monospace box. (3) Paste the reply: a monospace box; a bad reply shows the reason under it. (4) Check the plan: a preview card (title, artist, tempo; sections with goal counts; play order tags; every goal with its target and "after …"; chord chart and link counts), then "Create song", which saves everything and opens the song.

## Song

Back and edit buttons, title, artist, overall progress bar with "3 of 8 goals done" (`doneCount`), then two buttons: Practice (primary) and Goals. Below: Sections (each row: name, goal count and done count, progress bar and percentage, chevron, and a round play button that starts Practice at the section's first unfinished goal, hidden when the section has no goals; an "Add" link), Structure (the ordered section names as small chips, with an "Edit" link), Chord notes (monospace card, tapping opens Edit song), and Links (the song's resources, each a row with its kind, label and chevron, opening in a new tab; an invitation when there are none).

## Edit song, New song

Fields: Title, Artist, Tempo (the tempo stepper, with a "No tempo set" toggle; new songs start with none), Chord notes (large monospace textarea), Links (rows of label, address and kind, with remove and "Add link"). New goals for the song start their target tempo at the song's tempo (`newGoalTargetBpm`), or 80 without one. New shows "Create song". Edit shows "Save changes" and a pink outlined "Delete song" button that opens the confirm sheet.

## Edit section, New section

Name field with preset chips underneath (Intro, Verse, Pre-chorus, Chorus, Bridge, Solo, Outro) that fill the name. Notes textarea. Edit also lists the section's goals (with an Add link) and has a Delete section button.

## Structure

The ordered list of slots: drag handle, position number, section name, remove button. Reordering by drag (use pointer events or a small library such as dnd-kit, and give keyboard users up and down controls). Below, "Add to structure" chips append a section. A section may appear more than once. Save returns to Song.

## Goals

Title area with the song name, filter chips (All, To do, Done, with counts), then goals grouped under Whole song and then each section in song order. Group headers have a count and a plus button that starts a new goal in that group.

Each goal card: the title, an orange progress bar (`goalProgress`), and one line of text under it: "fastest Solid 72 of 84 BPM", or "No Solid attempt yet" when there is none, or "Solid attempt logged" for a goal with no target tempo. A yellow "Done" check appears on done goals. **There is no quality meter or quality name on the card.** Tapping a goal opens Goal progress; the round play button on its right starts Practice at that goal. A locked goal (something it requires is not done) shows a lock icon and "Finish Full chorus with block chords first" under the summary.

## New goal, Edit goal

"Applies to" chips (Whole song and each section), Title, Description, Target tempo (a stepper with minus and plus around a big number, 30 to 240, with a "No target tempo" toggle that clears it), Links (as on the song form), "Finish first" (chips for every other goal of the song, in goal order; picked ones are the goals to finish before this one, with a note that it only sets the order; a chip that would make a circle is disabled; hidden when the song has no other goals), and Save. Edit adds Delete goal. There is no target-level field: every goal is measured against Solid.

## Goal progress

Section label, goal title, description, and while the goal is locked a lock icon with "Finish X and Y first", each a link to that goal's progress (its back arrow returns here), then the goal's links. A summary card: the progress bar with "fastest Solid 72 of 84 BPM" and a "Done" state. Under it, a "Practice this goal" button that starts Practice at this goal (hidden when you came here from Practice). A "Log attempt" card: tempo stepper (with a "No tempo" toggle), five quality options as selectable rows (each with a mini meter, the label, and a check on the selected one), a short Note box ("What went wrong, what to try next"), and "Save attempt". Below, History: newest first, each row with date, BPM (or "no tempo") and quality (meter, color and label), the note under them when there is one, and edit and delete icon buttons. An edit button in the top bar opens Edit goal.

## Practice

See "Practice screen behavior" in the README. Mobile: header (song picker, Finish), timer with pause, section chips in a 3-column grid with progress bars, goal card, metronome (beat dots, BPM readout with minus and plus, slider, big play and pause button), and previous and next goal buttons pinned to the bottom. The song picker is a bottom sheet listing songs.

Desktop: left panel with the back link, song picker, timer, the full goal list (section label and title, the current goal highlighted; a locked goal shows a lock icon beside its percentage), and Finish. The main area holds the section chips (with progress bars in a row), a larger goal card, and a horizontal metronome panel.

## Practice review

Shown after Finish. Total time (large serif, `sessionElapsedMs`), song, and the counts: goals worked, goals improved (`sessionChanges`) and, when any, goals unlocked (`openedInSession`).

**Today's firsts**: a 2×2 of cards (`sessionFirsts` in src/domain/firsts.ts, at most four, most important first): Goal done, First Solid / New fastest Solid ("84 BPM, up from 76, on …"), Level N reached ("2 goals opened"), Longest this month, Streak kept. Each card: a small icon disc, a bold title, a muted line. Absent when the session had none.

**Over time**: a card with a line chart (`ProgressHistoryChart`, hand-drawn SVG) of the song's overall progress before its first session and after each finished one (`progressHistory` in src/domain/history.ts), the reviewed session ringed in yellow, "Before" and "This session" under the ends, and "3 sessions" top right. The chart's label and a hidden list say the same in words.

**Progress**: a card of before/after rows (`ProgressChange`, with a Before/After legend): first "Whole song · Overall progress · every goal" (`songProgressChange`), then one row per goal worked on (`progressBefore` / `progressAfter`). Each row: "45% → 61%" and a track with a hollow dot (before), a filled orange dot (after) and a line between; one muted dot when unchanged.

**Worked on**: one card per goal with attempts in this session: section, title, edit button (opens Goal progress), then Tempo and Quality comparing the goal's last attempt before the session with its last attempt in it ("54 → 60 BPM", "Many mistakes → Few mistakes"; just the session value when there was nothing before), a small chart of the session's tempos for the goal in order, each dot coloured by its quality, against a dashed line at the target (`SessionTempoChart`; absent when no attempt had a tempo), a quality meter of the last attempt with the Solid segment outlined, "Last time: 3 months ago" when the earlier attempt is over 14 days older than the session, and a change tag (`changeTag` in `reviewText.ts`): "Done", what went up ("+6 BPM · quality up"), "Fastest Solid now 76 BPM", what went down (muted), or "No change". Any notes written in the session are listed under it, each with the tempo it was logged at.

**Next time, start with**: the same suggestion as Home's Start here, for this song (`suggestGoal` with just this song): section and where it stands, the goal's title, the next step, and a play button that opens Practice at that tempo.

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
