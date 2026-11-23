# FinTrack design system — "Broadsheet"

An editorial, near-monochrome page: near-black paper, white ink, hairlines instead of shadows, and one electric-lime accent. Lime is spent on what you act on and on money you kept; everything else stays grey. Oversized type does the heavy lifting.

## Colour (tokens in `src/index.css`)

| Role | Token | Value |
|---|---|---|
| App background | `paper` | `#0D0D0D` |
| Panels, drawers | `surface` | `#141414` |
| Wells, hover | `sunken` | `#1C1C1C` |
| Hairlines | `line` / `line-strong` | `#262626` / `#383838` |
| Text | `ink` → `ink-4` | `#F5F5F5` (18:1) → `#5C5C5C` |
| Accent | `accent` (electric lime) | `#C6F45E`, text on it `#0D0D0D` |
| Saved / income | `positive` (mint) | `#5FE0A5` |
| Overspent | `negative` (coral) | `#FF7F66` |
| Near a limit | `caution` | `#F4C25A` |
| Charts | current / previous / income / spending | lime / dashed grey / sky `#7CC6FF` / apricot `#FFA26B` |

The landing page has one inverted section (Privacy) that flips to `ink` paper with `paper` text.

## Type

- **Geist** — everything: display headlines (`.ft-display`: 600, −0.055em, 0.9 line-height), interface, figures (tabular via `.num`).
- **Instrument Serif italic** (`.ft-serif`) — the editorial accent, one phrase per headline at most.
- **JetBrains Mono** — section markers like `(02) What it does`, figure captions, indices and code-like readouts (`.ft-label`).

## Signature visual

`src/components/landing/MoneyFlow.tsx` — "Fig. 1": this month's income fanning out into where it went, ribbon widths proportional to the real sample figures (`src/lib/heroPreview.ts`). The kept ribbon is lime. The numbered legend is made of real buttons (hover, focus or tap to read any ribbon); the SVG is decorative.

## Interaction

| Pattern | Where |
|---|---|
| Ribbon / legend focus readout with spring swap | landing hero |
| Magnetic primary buttons | landing CTAs |
| Drag-and-release stat tiles (`PullCard`), tilt (`TiltCard`) | dashboard |
| Press squash + ink ripple | every button |
| Sliding nav pill / tab blob (`layoutId`) | sidebar, phone tab bar |
| Scroll-linked product reveal (tilt → flat) | landing |
| Word rise, blur-rise reveals, page settle, chart draw-in, count-ups | everywhere |

`<MotionConfig reducedMotion="user">` and CSS media queries turn all of it off for reduced motion.

## Layout

Landing: 1360px frame, fluid `clamp(16px, 3vw, 40px)` gutter, 12-column hero. App — phone (< 768): top bar + floating tab bar; tablet (768–1023): icon rail; desktop (≥ 1024): labelled sidebar. Checked at 1440, 1280, 375 and 320 px with no horizontal overflow. Dark theme only.
