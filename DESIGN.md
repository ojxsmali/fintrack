# FinTrack design system — "Night ledger"

Deep green-black, bone-white ink and one electric lime accent. Lime is spent on what you act on and on this month's data; everything else stays quiet. Interfaces should feel physical: things you press squash, things you drag spring back.

## Colour (tokens in `src/index.css`)

| Role | Token | Value |
|---|---|---|
| App background | `paper` | `#0B0D0C` |
| Panels, drawers | `surface` | `#131715` |
| Wells, hover | `sunken` | `#1B201D` |
| Hairlines | `line` / `line-strong` | `#242A27` / `#343C38` |
| Text | `ink` → `ink-4` | `#F1F4EF` (17.6:1) → `#5D6761` |
| Accent | `accent` (electric lime) | `#C6F45E`, text on it `#0B0D0C` |
| Saved / income | `positive` (mint) | `#5FE0A5` |
| Overspent | `negative` (coral) | `#FF7F66` |
| Near a limit | `caution` | `#F4C25A` |
| Charts | current / previous / income / spending | lime / dashed grey / sky `#7CC6FF` / apricot `#FFA26B` |

## Type

- **Bricolage Grotesque** — display: headlines, page titles, headline figures.
- **Onest** — interface text, tabular figures via `.num`.
- **JetBrains Mono** — keys and code-like labels.

## Interaction (`src/components/motion/`, `motion` library)

| Pattern | Where |
|---|---|
| Drag-and-release cards that spring back (`PullCard`) | landing hero cards, dashboard stat tiles |
| Magnetic buttons (`Magnetic`) | landing CTAs |
| Pointer tilt (`TiltCard`) | dashboard balance card, feature bento |
| Cursor spotlight (`.ft-card` + `spotlight`) | every panel |
| Press squash + ink ripple | every button |
| Sliding nav pill / tab blob (`layoutId`) | sidebar, phone tab bar |
| Scroll-linked product reveal (tilt → flat, scale up) | landing |
| Word rise + lime marker sweep | landing headline |
| Blur-rise reveals, page settle, section stagger, chart draw-in, count-ups | everywhere |

`<MotionConfig reducedMotion="user">` and CSS media queries turn all of it off for reduced motion.

## Layout

Phone (< 768): top bar + floating pill tab bar. Tablet (768–1023): icon rail. Desktop (≥ 1024): labelled sidebar. Checked at 1440, 1280, 768, 390, 375 and 320 px with no horizontal overflow.
