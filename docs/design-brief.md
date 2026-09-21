# Pocket: design brief

Prompt for Figma Make. Start with the overall look plus screens 2 (Song detail) and 5 (Practice session), then add the rest once the direction feels right.

```
Design a mobile-first web app called "Pocket" for musicians (piano-first) to
track their progress learning songs, mostly pop songs and jazz standards.
It is used on a phone sitting on the piano, and on a laptop for editing.
Design at 390px wide first, then a responsive desktop layout.

DESIGN FEEL
Calm, focused, and modern, like a well-designed practice journal. Not
playful or gamified. Support light and dark mode; dark mode should be
comfortable in a dim room. Large tap targets (min 44px). One warm accent
color (amber or coral) for progress and primary actions, neutral grays
otherwise. Clear typography with strong hierarchy.

CORE CONCEPTS
- A Song is divided into Sections: intro, verse, chorus, bridge, outro,
  head, solo (jazz), or custom. Each section is defined once.
- A song has a Structure: the order the sections are played, where sections
  can repeat. Example: Intro, Verse, Chorus, Verse, Chorus, Bridge, Chorus,
  Outro.
- Each section has Goals ("what to practice"), such as "Left hand alone",
  "Right hand alone", "Hands together", "Shell voicings", "Rootless
  voicings". A goal has an optional target BPM (editable any time) and a
  target quality level. Progress on a goal = the fastest BPM at which the
  user has played it cleanly (Solid or better). Show this as "best clean BPM
  / target BPM" with a thin progress bar. Goals without a target BPM show a
  done / not-done state instead. Do NOT show a standalone rating on the goal
  card.
- Each practice attempt logs a BPM (optional) and a quality level on a
  5-step scale: Can't yet, Rough, Shaky, Solid, Mastered. Show it as a
  segmented control or 5 labeled chips, not stars, with a distinct color per
  level (cool and muted for Can't yet, warming up to the accent color for
  Mastered). Attempts rated "Can't yet" appear in the history but don't
  count as progress.
- Practice Sessions: the user starts a session, picks sections to focus on,
  works through goals, and logs an attempt (BPM + quality level) for each.
- A song is "Learned" when every goal has been reached, with a manual
  "mark as learned" override.

SCREENS (design each one)
1. Library (home): list of songs with title, artist, a small "pop" or "jazz"
   tag, a circular progress ring, and last-practiced date. Filter tabs:
   All / Learning / Learned. Floating "Add song" button. Bottom tab bar:
   Library, Practice, Repertoire.

2. Song detail: title, artist, key, target tempo. A horizontal scrollable
   "structure strip" of small colored chips showing play order (Intro, V, C,
   V, C, Bridge, C, Outro), with each section type having its own subtle
   color. Below it, a card per section listing its goals, each with a thin
   progress bar, "best clean BPM / target BPM", and a small last-practiced
   date. Primary button: "Start practice".

3. Structure editor: reorder and duplicate sections in the play order with
   drag handles; add a section from a type picker; delete; rename.

4. Add / edit goal: bottom sheet with goal name (with suggestion chips like
   "Hands together", "Left hand", "Shell voicings"), optional target BPM
   stepper, and target level (default Solid).

5. Practice session (the most important screen; make it feel focused):
   a top bar with an elapsed timer and "End session". One large card for the
   current section and goal. A big BPM stepper (- / + buttons, tap the number
   to type), the 5-level quality selector, an optional note, and a large
   "Log it" button. Below, a compact history of recent attempts on this goal
   (BPM + level), then an "Up next" list of the remaining goals in the focus
   sections. Minimal distraction; usable one-handed.

6. Session summary: time practiced, goals worked on, before/after progress
   for each, and any goals that reached target ("Nailed it").

7. Repertoire: the "Learned" songs as a clean grid or list with last
   practiced date, and a subtle prompt to review songs not practiced in 30+
   days.

8. Empty states for the library, and for a new song with no sections yet.

SAMPLE DATA (use realistic content)
Songs: "Fly Me to the Moon" (Sinatra, jazz, key of C), "Autumn Leaves"
(jazz standard, Gm), "Let It Be" (The Beatles, pop, C), "Someone Like You"
(Adele, pop, A), "Blue in Green" (Miles Davis, jazz, Dm).
For "Autumn Leaves": sections Head A, Head B, Solo, Outro, with goals like
"Shell voicings, best 105 / target 120 BPM", "Rootless voicings, best 80 /
target 100 BPM", and "Walking LH, best 110 / target 110 BPM (reached)".

Make the interactions feel real: working steppers, the level selector, tabs,
and a bottom sheet that opens.
```
