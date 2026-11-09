# GigSync — Design System

Practical reference so new UI stays consistent instead of turning into a
collage of one-off styles. Keep this short — add a rule only when a real
inconsistency justified it.

## Tokens

Defined in `app/styles/globals.css` under `@theme`. Always reach for these
before hardcoding a color/radius — a hardcoded hex or arbitrary Tailwind
value (`bg-[#123456]`) in a component is a sign a token is missing, not a
reason to skip using one.

| Token | Use |
|---|---|
| `--color-primary` | Primary actions, active states |
| `--color-background-light` / `-dark` | Page background (see `dark:` variants throughout) |
| `--color-foreground-light` / `-dark` | Body text |
| `--color-border-light` / `-dark` | Borders/dividers |
| `--color-card-light` / `-dark` | Card/panel surfaces |
| `--color-success` / `-error` / `-warning` / `-info` | State colors |
| `--color-chord-accent` (`#38bdf8`) | Default chord label / beat-highlight color — the standard the new player color pickers default to |
| `--radius-sm` … `--radius-full` | Corner radius scale |

Most components still reference the equivalent Tailwind slate/indigo
utility classes (`bg-slate-50 dark:bg-[#101322]`, `text-indigo-600`, etc.)
rather than the CSS vars directly — that's the established pattern here,
follow it rather than introducing a third way to express the same colors.

`--color-primary` **is** indigo-600 (`-dark` = 700, `-light` = 500): there is
one brand color, so `bg-primary` and `bg-indigo-600` render the same. Don't
reintroduce a second blue.

## Layout — every main screen uses `Page`

`app/components/layout` is the frame all main screens share (library,
setlists, metronome, tuner, profile, settings). Don't hand-roll a header, a
`min-h-screen` wrapper or a navigation bar in a route.

- `Page` — title (+ optional `subtitle`, `backTo`, `actions`), the content
  column and the app navigation. `width="wide"` (lists) or `"narrow"` (forms,
  settings).
- Navigation adapts by itself: bottom bar on phones (`< md`), icon rail on
  tablets (`md`), labelled sidebar on desktop (`lg+`). The song player is the
  only full-screen view without it.
- Lists are one column on phones and a card grid from `md:` up
  (`grid gap-3 md:grid-cols-2 xl:grid-cols-3`). A tool with settings
  (metronome, tuner) stacks on phone/tablet and puts the settings in a right
  column from `lg:` up.
- `buttonClass(variant)` / `iconButtonClass()` — the buttons. 44px targets;
  one `primary` per screen. `cardClass` — the card surface. `SectionTitle` —
  the small uppercase heading.
- `Dialog` — the modal: bottom sheet on phones, centered card from `sm:` up.
  `fieldClass` / `fieldLabelClass` for its inputs.
- `EmptyState`, `ErrorBanner`, `PageLoading` — the three states every list
  screen has.
- Icons are `lucide-react`. No emoji and no Material Symbols as UI icons.
- UI copy is Spanish.

## Shared settings primitives

`app/components/profile/SettingsSection.tsx` is the one settings UI kit —
used by both the main Settings page (`routes/profile/settings.tsx`) and the
player's inline settings panel (`PlayerControls.tsx`). Reuse these instead
of hand-rolling a new row/toggle/stepper:

- `SettingsSection` — titled card wrapping a group of rows.
- `SettingsRow` — label (+ optional description) on one side, control on
  the other. Responsive: stacks on narrow screens, sits side by side from
  `sm:` up. Use this for every setting row.
- `SettingsToggle` — on/off switch.
- `SettingsSelect` — dropdown for a fixed string union.
- `SettingsSlider` — continuous range input.
- `SettingsStepper` — discrete -/value/+ control (font size, margins,
  transpose-style settings). Takes an optional `format` to display
  something other than the raw number (e.g. a note name).
- `SettingsColorField` — color swatch input, with an optional reset button
  for overridable/nullable colors (pass `onReset` only when the setting has
  a theme default to fall back to).
- `SaveTierButtons` — the 3-tier save action (song / setlist / library)
  every player setting exposes. Pass `canSaveForSetlist` only when the
  player was opened from within a setlist (`SetlistContext` present) —
  there's nothing to attach a setlist-level override to otherwise.

## Adding a new setting — checklist

1. Type it in `PlayerOverrides` (`types/setlist.ts`) — this one interface
   is shared by the song, setlist and global-defaults tiers, plus the live
   `SongPlayerState` (`types/song.ts`). Don't duplicate the field three times.
2. Add live state + setter in `useSongPlayer` (`hooks/useSongs.ts`).
3. Resolve it (song → setlist → global → hardcoded fallback) in
   `SongPlayerContent.tsx`.
4. Render it with `SettingsRow` + the matching primitive above +
   `SaveTierButtons` — don't write new stepper/toggle/color-input markup.
5. `npx tsc --noEmit` and `npx vitest run` clean before calling it done.

## Why this matters

The player's settings panel used to hand-roll its own row/stepper markup
separately from the main Settings page's components, and every control
duplicated the same -/value/+ JSX. That's exactly how an app ends up
looking like several different apps stitched together as it grows — treat
divergence from this file as a bug, not a style choice.
