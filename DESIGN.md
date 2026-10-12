---
name: lastdone
description: A printed departure timetable for household chores, on warm paper by day and a navy night board after dark.
colors:
  yellow: "#f6c800"
  red: "#c62a1f"
  green: "#2f6b3a"
  paper: "#fbf7e8"
  paper-raised: "#fffdf6"
  ink: "#141414"
  ink-2: "#4a463a"
  ink-3: "#6e685a"
  rule: "#ddd5ba"
  composer-ink-2: "#cfc8ae"
  night-paper: "#0f2340"
  night-paper-raised: "#15304f"
  night-mast: "#0a1830"
  night-ink: "#eef0f4"
  night-ink-2: "#b4bfd1"
  night-ink-3: "#93a0b6"
  night-rule: "#26405f"
  night-red: "#ff7a6b"
  night-green: "#8fd19e"
  night-composer-ink-2: "#a9b4c8"
typography:
  display:
    fontFamily: "'Barlow Semi Condensed', 'Arial Narrow', sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "'Barlow Semi Condensed', 'Arial Narrow', sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  figure:
    fontFamily: "'Barlow Semi Condensed', 'Arial Narrow', sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1
    fontFeature: "\"tnum\""
  figure-small:
    fontFamily: "'Barlow Semi Condensed', 'Arial Narrow', sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.2
    fontFeature: "\"tnum\""
  title:
    fontFamily: "'Barlow Semi Condensed', 'Arial Narrow', sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.2
  label:
    fontFamily: "'Barlow Semi Condensed', 'Arial Narrow', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.08em"
  command:
    fontFamily: "'Barlow Semi Condensed', 'Arial Narrow', sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.02em"
  chore:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "\"tnum\""
  body-small:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.45
  meta:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
  caption:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.45
  button:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.2
rounded:
  radius: "6px"
spacing:
  gutter: "1rem"
  gutter-wide: "1.5rem"
  gap: "0.75rem"
  gap-wide: "1rem"
  row: "0.875rem"
  section: "1.75rem"
  col-due: "5rem"
  col-due-wide: "6rem"
  col-every: "4.75rem"
  col-every-wide: "5.5rem"
  col-last: "10rem"
  col-done: "5.5rem"
  measure: "46rem"
  measure-wide: "60rem"
components:
  masthead:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.display}"
    padding: "0.75rem 1rem 0.625rem"
  board-row:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    padding: "0.875rem 1rem"
  board-row-overdue:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.red}"
  due-figure:
    textColor: "{colors.ink}"
    typography: "{typography.figure}"
  due-figure-next:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.ink}"
    padding: "0.15rem 0.25rem 0.1rem"
  column-head:
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    padding: "0.875rem 1rem 0.5rem"
  done-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.radius}"
    padding: "0.3rem 0.75rem"
    height: "2.25rem"
  done-button-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  done-button-urgent:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  done-button-urgent-hover:
    backgroundColor: "{colors.red}"
    textColor: "{colors.paper}"
  button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.radius}"
    padding: "0.5rem 0.875rem"
    height: "2.5rem"
  button-primary:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.radius}"
    padding: "0.5rem 0.875rem"
    height: "2.5rem"
  button-danger:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.radius}"
    padding: "0.5rem 0.875rem"
    height: "2.5rem"
  text-button:
    textColor: "{colors.ink-2}"
    typography: "{typography.meta}"
  text-button-hover:
    textColor: "{colors.ink}"
  field-input:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.radius}"
    padding: "0.45rem 0.6rem"
    height: "2.5rem"
  composer:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    padding: "0.75rem 1rem"
  composer-input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.radius}"
    padding: "0.6rem 0.8rem"
    height: "3rem"
  composer-send:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.command}"
    rounded: "{rounded.radius}"
    padding: "0 1rem"
    height: "3rem"
    width: "4.75rem"
  example-prompt:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.radius}"
    padding: "0.5rem 0.75rem"
---

# Design System: lastdone

## Overview

**Creative North Star: "The Departure Timetable"**

Every chore is a scheduled departure: when it last left, when it is due again. The interface is a printed timetable pinned up at home, with a timetable-yellow header strip closed by a heavy ink rule, a warm paper ground, ink-black type, hairline rules between rows, and one delay red that appears only when something is late. After dark it becomes the station's night board: navy ground, yellow rules and yellow masthead lettering, the same lateness signal lightened so it still reads.

The board is dense and calm. Rows are ranked by urgency, so position carries the meaning; every Due figure is set at the same size whether it says "+2 d" or "17 d", and status comes from rank, colour and the column it sits in, never from scale. A condensed board face prints everything the timetable would print (figures, column heads, the wordmark, the clock), and a plain text face carries chore names, sentences and controls. Figures are tabular throughout so the columns line up.

The sentence input is an ink strip docked at the bottom of the board, laid out like the last line of the timetable rather than a chat window. Replies appear as one ruled line above the input with a small square marker; there are no bubbles, avatars or sparkles. The only celebration a log receives is mechanical: the Due figure flips in character by character and the row slides to its new rank.

**Key Characteristics:**
- Yellow masthead strip closed by a 3px rule; ink in light mode, yellow in dark mode.
- One column grid (Due / Chore / Last done / Every / Done) shared by heads, rows, group heads and indented forms.
- Red reserved for lateness; errors and destructive actions speak in bold ink.
- Barlow Semi Condensed for printed figures and heads, Barlow for names and prose, tabular numerals everywhere.
- Flat paper with hairline rules; depth only through a raised paper tone, never through shadows.
- Corners square-ish at 6px; no pills, no circles.
- Split-flap figure flip and a rank slide as the signature motion, both removed under reduced motion.

## Colors

A warm paper-and-ink timetable with one signal yellow and one delay red, remapped to a navy night board when the system is dark.

### Primary
- **Timetable Yellow** (`yellow`): the masthead strip in light mode; the highlight chip behind the next departure's Due figure; the single primary action in view (the Log key, Add, Turn on AI, a suggested reply action); the model download progress bar; the status-line link inside the composer; text selection. In dark mode the same yellow stops being a fill on the masthead and becomes its lettering, every heavy rule and the focus ring. Text sitting on yellow is always `ink`, in both modes.

### Secondary
- **Delay Red** (`red`, `night-red` in dark mode): lateness only. The overdue Due figure and its "was ..." line, the open stretch in an overdue row's history marks, the square before the masthead's overdue count, and the hover fill of an overdue row's Done button. A 55% mix of red into `ink-2` marks past passes that ran late, shown only on overdue rows.

### Tertiary
- **Ledger Green** (`green`, `night-green` in dark mode): confirmation notes in Settings ("Notifications are on", a successful import). It never appears on the board.

### Neutral
- **Timetable Paper** (`paper`): the page ground and the default row fill; the text colour of ink-filled buttons; the composer's lettering and input field in light mode.
- **Raised Paper** (`paper-raised`): the one tonal step up. The overdue row, the open add-a-chore form, text inputs, example prompts, the import confirmation panel and the add-a-chore hover.
- **Print Ink** (`ink`): body text, chore names, 1.5px control borders, the heavy rule under the masthead and under column and group heads in light mode, the composer strip in light mode, the urgent Done fill and the danger fill.
- **Second Ink** (`ink-2`): column heads, group heads, secondary row text (last done, Every values, due lines), field labels, text buttons at rest, history marks.
- **Faint Ink** (`ink-3`): placeholders, field hints, the chevron beside a chore name, the dash for an unscheduled row's Due figure, input borders at rest.
- **Hairline** (`rule`): 1px row separators, the dashed rule that opens a row's details, history row separators, example prompt borders.
- **Composer Dim** (`composer-ink-2`): the model status line and secondary text inside the ink composer.
- **Night Board** (`night-paper`), **Night Raised** (`night-paper-raised`), **Night Mast** (`night-mast`): the dark-mode ground, raised tone (also the composer input field) and the masthead and composer strips.
- **Night Ink** (`night-ink`), **Night Second Ink** (`night-ink-2`), **Night Faint Ink** (`night-ink-3`), **Night Hairline** (`night-rule`), **Night Composer Dim** (`night-composer-ink-2`): the dark-mode counterparts of the light neutrals, role for role.

### Named Rules
**The Delay Red Rule.** Red marks lateness and nothing else. Errors, warnings, destructive buttons and confirmations of deletion speak in bold `ink` (the danger button is ink-filled); if a new element is not about a chore being late, it is not red.

**The Signal Yellow Rule.** Yellow is the timetable's signal: the masthead, the next departure's figure, and the one primary action in view. It is never a fill for rows, groups, panels or backgrounds below the masthead.

**The Night Board Rule.** Dark mode is a different board, not an inverted one. The ground goes navy, yellow takes over the masthead lettering, every heavy rule and the focus ring, and red lightens to `night-red` to keep its contrast. Text on yellow stays `ink` in both modes.

## Typography

**Display Font:** Barlow Semi Condensed (with Arial Narrow, sans-serif), self-hosted at 500, 600 and 700
**Body Font:** Barlow (with system-ui, sans-serif), self-hosted at 400, 500 and 600

**Character:** A condensed transit-signage face prints the timetable's figures and heads; its wider sibling from the same family carries names and sentences, so the pairing reads as one printed sheet with two registers.

### Hierarchy
- **Display** (700, 1.875rem, rising to 2.5rem at 44rem and wider, line-height 1, -0.02em): the lowercase "lastdone" wordmark in the masthead. Nothing else.
- **Headline** (700, 1.75rem, line-height 1.1, -0.01em): page titles (Settings) and the empty board's "No chores yet."
- **Figure** (700, 1.375rem, rising to 1.75rem at 44rem, line-height 1, tabular): the Due cell ("+2 d", "3 d", "Today", "Now"). One size for every row.
- **Figure small** (500, 0.8125rem, line-height 1.2, tabular): the due line under a figure ("was Oct 10", "Thu 15") and the weekday in the masthead clock. The clock time uses the board face at 600, 1rem (1.25rem wide).
- **Title** (600, 1.25rem, line-height 1.2): Settings section heads; sub-heads drop to 1.0625rem.
- **Label** (600, 0.75rem, line-height 1, 0.08em, uppercase): column heads (Due, Chore, Last done, Every), the "No schedule" group head, and the History and Schedule heads inside a row's details. The masthead's overdue count uses the same register at 0.8125rem and 0.06em.
- **Command** (700, 1.0625rem, 0.02em): the composer's Log key.
- **Chore** (600, 1.0625rem, rising to 1.1875rem at 44rem, line-height 1.25): chore names on the board. Text face, never the board face.
- **Body** (400, 1rem, line-height 1.45, tabular): sentences, replies in the composer (capped at 62ch), Settings prose (62ch).
- **Body small** (0.9375rem): the Last done column, Every values, history rows, Settings notes and model choices.
- **Meta** (0.875rem): the mobile "Done 9 days ago" line, relative ages in history, text buttons, the Done button (at 600).
- **Caption** (500, 0.8125rem): field labels, hints, the composer status line, "Understood by the on-device model".
- **Button** (600, 0.9375rem, line-height 1.2): outlined, primary and danger buttons.

### Named Rules
**The Two Faces Rule.** The board face prints what a timetable prints: figures, column and group heads, the wordmark, the clock, page and section titles, the Log key. The text face carries chore names, sentences, buttons and forms. Never set a chore name in the board face or a figure in the text face.

**The Tabular Rule.** Every numeral is tabular (set once on the body), so due counts, intervals and dates align down their columns.

## Layout

The board is a single centred column, `measure` wide (`measure-wide` from 44rem), with `gutter` side padding (`gutter-wide` from 44rem). The masthead, the board and the composer all share that measure, so the wordmark, the Due column and the input start on the same left edge.

The timetable grid is the armature. On phones it has three tracks: `col-due`, a flexible Chore track, and `col-every`, with the Done button stacked under the Every value and the last-done date folded into the chore's meta line. From 44rem it widens to five tracks: `col-due-wide`, Chore, `col-last` (a Last done column with its own head), `col-every-wide` and `col-done`, so each departure reads on one line with Done in its own column. Column heads, rows and group heads share the same tracks and the same `gap`.

Rows carry `row` padding top and bottom. A row's details open inside the row, starting at the Chore column and spanning to the right edge, split into History and Schedule halves from 44rem. The add-a-chore toggle, its form and the empty-board text indent to the Chore column (gutter + Due column + gap); under 30rem they fall back to the gutter. Unscheduled chores sit after the scheduled ones under a "No schedule" group head with `section` space above it.

The masthead is sticky at the top and the composer sticky at the bottom, both honouring the device safe areas. Settings replace the board inside the same shell, with sections separated by hairlines and `section` padding.

### Named Rules
**The Column Armature Rule.** Anything new on the board aligns to the timetable tracks: figures in the Due column, names and forms from the Chore column, numbers right-aligned in Every. Content that floats free of the columns does not belong on the board.

## Elevation & Depth

The system is flat. Nothing on the page casts a shadow; it is a printed sheet. Depth is carried by rules and one tonal step: `paper-raised` lifts the row that needs attention, the open add form, inputs and the confirmation panel, while rule weight sets hierarchy (a 3px rule under the masthead, 1px strong rules under column and group heads, 1px hairlines between rows, a dashed hairline opening a row's details). The two sticky strips, the yellow masthead and the ink composer, read as separate layers purely by colour. The only box-shadows in the build are inset 1.5px strokes standing in for borders (the outlined reply marker and the disabled Log key); they draw outlines, not elevation.

### Named Rules
**The Printed Sheet Rule.** No drop shadows, no blur, no floating cards. If something needs to stand forward, give it `paper-raised` or a stronger rule.

## Shapes

Corners are square-ish at one value, `radius` (6px), on every control: Done buttons, outlined and filled buttons, inputs, the composer field and Log key, icon buttons, example prompts and the confirmation panel. Rows, the masthead and the composer are full-bleed rectangles with no rounding. Control borders are 1.5px; rules are 1px or 3px. Small solid squares (0.5rem) serve as markers: red before the overdue count, yellow before a composer reply. History marks are flat 0.875rem by 0.25rem bars with 3px gaps, the open stretch on an overdue row widening to 1.5rem in red. Icons are 1.25rem line drawings with a 1.75 stroke and round caps, inheriting the text colour.

The next-departure chip behind a Due figure currently uses a tighter 3px corner, below the world's 4–6px range; treat it as an exception rather than a second scale step.

### Named Rules
**The Square-ish Rule.** One corner, 6px. Nothing is a pill, a circle or a soft card.

## Components

### Buttons
Printed and plain: outlined in ink, filled only when the action is the one that matters.
- **Shape:** gently squared corners (`radius`), 1.5px border, minimum 2.5rem tall.
- **Outlined (default):** transparent with an `ink` border and text; hover lays an 8% ink tint; disabled drops to 50% opacity.
- **Primary:** `yellow` fill and border with `ink` text; hover mixes 15% ink into the yellow. Reserved for the main action of its context: Add, Turn on AI, a suggested reply action.
- **Danger:** `ink` fill with `paper` text; hover mixes 15% paper into the ink. Used only for irreversible confirmations ("Delete with 4 entries", "Replace my data"), always reached through a quieter first step.
- **Text button:** underlined (1px, offset 0.2em) in `ink-2`, turning `ink` on hover; the danger variant is `ink` at 600.
- **Icon button:** a 2.75rem square, transparent, inheriting the strip's colour, with a 12% current-colour tint on hover.
- **Focus:** every control shows a 2px `focus` outline at 2px offset (ink in light mode, yellow in dark).

### Done Button
The board's one-tap action, on every row.
- **Rest:** transparent, 1.5px `ink` border, `radius`, 2.25rem tall, text at 600.
- **Hover:** fills with `ink`, text turns `paper`.
- **Urgent (overdue rows only):** filled with `ink` at rest; hover turns the fill `red`, the one interactive use of red.
- **Placement:** stacked under the Every value on phones; its own right-aligned column from 44rem.

### Inputs / Fields
- **Style:** `paper-raised` fill, 1.5px `ink-3` border, `radius`, 2.5rem tall, body size; label above in caption style, hint below in `ink-3`.
- **Focus:** the border darkens to `ink` and the focus outline sits at 1px offset.
- **Error:** an `ink` message at 600 under the field, never red.

### Navigation (Masthead)
- **Style:** sticky strip in `yellow` (light) or `night-mast` (dark), closed by a 3px rule in `ink` or `yellow`. Wordmark at left, the clock (weekday over date and time) right-aligned, then the Settings icon button, which becomes a close icon while Settings are open.
- **Alert line:** when chores are overdue, a label-style count with a red square sits under the wordmark on the board view.

### Board Row (signature component)
The departure line. Due cell, chore name, last done, interval, Done.
- **Due cell:** the figure in the board face, with the due line under it. Overdue rows set both in `red` and the whole row on `paper-raised`. The first scheduled row that is not late gets the yellow next-departure chip behind its figure. Unscheduled rows show a dash in `ink-3`.
- **Chore cell:** the name as a button in the chore style, with a small chevron that travels with the last word and rotates 180° when the details are open; hover underlines the name. Under it, the meta line and, on overdue rows only, the history marks.
- **Every cell:** "7 d" in the board face, `ink-2`, right-aligned.
- **Details:** open in place under a dashed hairline: History (dated list with relative ages, remove-with-confirm, "Done on another day") and Schedule (name, every-n-days, Save, delete-with-confirm).
- **Motion:** when a figure changes, each character flips in on the X axis from -100° with a slight overshoot, 420ms on `cubic-bezier(0.16, 1, 0.3, 1)`, staggered 55ms per character, left to right. When the ranking changes, rows slide from their old position to the new one over 520ms on the same curve. Both are removed under reduced motion; the chevron's 200ms rotation is too.

### History Marks
A row of up to seven flat bars for the most recent passes, ink for on-time, a red-tinted ink for passes that ran late, and a longer red bar for the open stretch since the last pass. Shown only on overdue rows; decorative and hidden from assistive technology.

### Composer
The docked ink strip at the foot of the board.
- **Strip:** `ink` (light) or `night-mast` (dark) with `paper` lettering, sticky at the bottom with safe-area padding. A 3px yellow progress bar runs across its top edge while the model downloads.
- **Input:** a 3rem `paper` field (`night-paper-raised` in dark), `radius`, no border, 1.0625rem text; focus draws a 2px yellow outline.
- **Log key:** `yellow` with `ink` lettering in the command style, at least as wide as the Every column; hover mixes in white; disabled becomes a 1.5px inset yellow outline with dimmed yellow text; while reading it says "Reading…".
- **Reply:** one line above the input, separated by a rule at 22% of the composer ink, led by a 0.5rem yellow square (solid for confirmations, outlined for warnings, absent for plain answers), with a dismiss icon and, when offered, a primary action.
- **Status line:** caption-size `composer-ink-2` text stating what runs on the device, with an underlined yellow action (Turn on AI, Retry).

### Example Prompts (empty board)
- **Style:** quoted sentences as stacked `paper-raised` buttons with a 1px `rule` border and `radius`; hover darkens the border to `ink`. Tapping one submits the sentence.

## Do's and Don'ts

### Do:
- **Do** rank rows by urgency and let rank, colour and column carry status; every Due figure keeps the same size.
- **Do** set every figure in the board face with tabular numerals, and every chore name in the text face.
- **Do** align new board content to the timetable tracks, indenting forms and empty states to the Chore column.
- **Do** separate rows with 1px hairlines, close column and group heads with a 1px strong rule, and keep the 3px rule for the masthead alone.
- **Do** keep text on yellow in `ink` in both light and dark modes.
- **Do** remove the figure flip, the rank slide and the chevron rotation under reduced motion while keeping the state change.

### Don't:
- **Don't** use red for errors, warnings, destructive actions or decoration; it marks lateness only.
- **Don't** use yellow as a fill for rows, groups or panels below the masthead.
- **Don't** add drop shadows, floating cards or cards on a gray ground; depth is `paper-raised` and rules.
- **Don't** use checkbox rows, pill buttons or blue accents for chores and actions.
- **Don't** render replies as chat bubbles, or add sparkles or an assistant persona to the composer.
- **Don't** round anything past 6px.
- **Don't** celebrate a log with confetti or streak counts; the flip and the re-rank are the only feedback.
