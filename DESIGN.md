# FinTrack design system

FinTrack should feel like a well-kept ledger: warm paper, dark ink, one petrol accent, and numbers that line up. Colour goes to data and state, not decoration.

## Colour (tokens in `src/index.css`)

| Role | Token | Value |
|---|---|---|
| App background | `paper` | `#f6f4ef` |
| Raised surface (panels, drawers) | `surface` | `#fdfcf9` |
| Wells, skeletons, hover | `sunken` | `#efece5` |
| Hairlines | `line` / `line-strong` | `#e3dfd6` / `#cfcac0` |
| Text | `ink` → `ink-4` | `#1a1a18` (16.2:1) → `#9a978f` |
| Accent (petrol) | `accent` | `#1f5260` |
| Money in / saved | `positive` (moss) | `#2e6a4c` |
| Overspent | `negative` (clay) | `#a3472f` |
| Near a limit | `caution` | `#8c6412` |

Money is never shown in saturated red or green. Spending is ink: it is normal, not an error.

## Type

- **Geist Variable** for UI and every number (`.num` turns on tabular figures).
- **Instrument Serif** only for page-level headlines (welcome hero, section titles, the dashboard greeting).
- Scale: 11 / 12 / 13 / 15 / 17 / 22 / 28 / 38 / 48 px. Body is 15 px.

## Shape and depth

- Radius 4 / 6 / 8 / 12 px. Cards use 8 px; the welcome hero card uses 12 px.
- Only overlays float (`--shadow-overlay`). Cards get a hairline and, on hover, a warmer hairline and a soft shadow (`.ft-card`).

## Motion (`src/components/motion/`, CSS in `src/index.css`)

One curve (`cubic-bezier(0.22, 1, 0.36, 1)`), no bounce, no loops except the hero's slow ambient light.

| Pattern | Where | Notes |
|---|---|---|
| Word-by-word headline rise | Welcome hero | Full sentence kept for screen readers (`SplitWords`) |
| Count-up figures | Welcome preview card, dashboard balance strip | Runs once when the figure is first visible (`CountUp`) |
| Sparkline draw + bar grow | Welcome preview card | Same sample data as the prototype |
| Scroll reveal | Welcome sections | `Reveal`, IntersectionObserver, 14 px rise |
| Tilted preview flattening on scroll | Welcome product screenshot | `--tilt` from scroll position |
| Page settle | Every route change | `.ft-page`, 420 ms |
| Section stagger | Dashboard | `.ft-stagger`, 60 ms steps |
| Series draw-in | All Recharts charts | 900 ms, once |
| Active-nav indicator | Sidebar and phone tab bar | Accent bar scales in |

`prefers-reduced-motion: reduce` turns all of it off: content renders in its final state at once.

## Layout

- Phone (< 768): top bar + bottom tab bar. Tablet (768–1023): icon rail. Desktop (≥ 1024): labelled sidebar.
- Content max width 1180 px in the app, 1200 px on the welcome page.
- Every page is checked at 1440, 1280, 768, 390 and 375 px with no horizontal overflow.
