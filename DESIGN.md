# FinTrack design system — "Gold Standard"

Money you can pick up. Warm cream paper, heavy ink outlines, hard offset shadows instead of blur, and one gold that means money: the 3D coins, the balance card and the primary action. Everything you can touch answers back with a spring, a push or a bounce.

The live brand kit is at `/brand` (`src/pages/BrandPage.tsx`): logo variants with SVG downloads, colour swatches (tap to copy), type specimens, motion rules and voice.

## Logo

A gold coin with an ink rim, carrying an **F built from three stacked bars** that step down like a bar chart (or coins on their side). It always sits on its own hard ink shadow.

- Geometry: `src/lib/brandMark.ts` (`LOGO_BARS`) — shared by the SVG mark (`LogoMark`), the favicon, the PWA icons and the extruded 3D coin.
- Tones: gold (primary), cream (on gold), ink (reversed: gold F on ink).
- Wordmark: Unbounded ExtraBold, −4% tracking, with a gold full stop. Hovering the lock-up flips the coin.

## Colour (tokens in `src/index.css`)

| Role | Token | Value | Contrast |
|---|---|---|---|
| Paper (page) | `paper` | `#F3EEE2` + 22px ink dot grid | — |
| Cards, drawers | `surface` | `#FFFCF4` | — |
| Wells, skeletons | `sunken` | `#E8E1CF` | — |
| Soft rules | `line` | `#D8CFBA` | decorative |
| Outline / text | `ink` (= `line-strong`) | `#16140F` | 15.9:1 on paper |
| Secondary text | `ink-2` / `ink-3` | `#45403A` / `#655E54` | 8.9:1 / 5.5:1 |
| Money, primary action | `accent` (gold) | `#FFC21A`, ink text on it | 11.4:1 |
| Gold as text | `accent-ink` | `#8A5A00` | 5.1:1 |
| Income, links, focus | `cobalt` | `#2F5BFF` | white on it 5.2:1 |
| Spending, warnings | `tangerine` | `#FF6A2B` | ink on it 6.4:1 |
| Saved / overspent / near limit | `positive` / `negative` / `caution` | `#0E7A4B` / `#C42B1C` / `#9A5800` | ≥ 4.6:1 |
| Charts | current / previous / income / spending | ink / dashed taupe `#A89F90` / cobalt / tangerine | every chart also has a table view |

One inverted section per page at most (landing: Privacy, ink with gold).

## Type

- **Unbounded** (`font-display`, `.ft-display` 800, −0.045em) — headlines, big figures, card titles, the wordmark.
- **Geist** — interface and body, tabular figures via `.num`.
- **JetBrains Mono** (`.ft-label`) — section markers, captions, stat labels, chart readouts.
- **Highlight** (`.ft-serif`, kept for compatibility) — a gold marker swipe behind one phrase per headline.

## Surfaces

- `.ft-card` / `.ft-sticker`: 2px ink border + 5px hard shadow. Cards lift toward the pointer (shadow grows to 7px).
- `.ft-push`: buttons sit on a 3px shadow and are pressed flat (translate 3px, 60ms) on click. Every filled `Button` variant uses it; ink ripple on top.
- Radius is chunky: 6 / 10 / 14 / 20px, pills for buttons, chips and the segmented control.

## 3D layer (`src/components/three`)

three.js + react-three-fiber + drei, **lazy-loaded** (`Scene3D.tsx`) so the app shell never downloads it, and only when WebGL is available (`webgl.ts`). If WebGL is missing or the context dies, a flat SVG fallback renders instead.

| Scene | Where | Interaction |
|---|---|---|
| `MoneyStacksScene` | landing hero, "Fig. 1" | This month's money as coin stacks (kept = gold, top four categories = cobalt / tangerine / cream / ink), heights proportional to real sample figures. Coins drop in with gravity and a 0.38 bounce. Drag to spin the turntable (momentum decays to an idle turn); tap a stack to make it jump and read it out. DOM stickers are projected onto stack tops each frame. |
| `BrandCoinScene` | dashboard balance card, brand kit cover | The extruded logo coin; flick to spin, floats and wobbles at rest. |

Performance: render pauses when the canvas is off screen; local `Lightformer` studio environment (no HDR download); phones (< 768px) get fewer coins (11 vs 16), DPR ≤ 1.5, no pointer parallax, no antialias on the hero and only the selected sticker. Reduced motion: no idle turn and no drop-in; drag still works because it's user-driven.

## Interaction

| Pattern | Where |
|---|---|
| Drag-to-spin 3D turntable, tap-to-jump stacks | landing hero |
| Flick-to-spin coin | dashboard, brand kit |
| Throwable feature cards (`PullCard`, spring back) | landing features, brand kit |
| Push buttons + ink ripple | every button |
| Sliding nav pill / tab blob / segmented pill (`layoutId`) | sidebar, phone tab bar, filters |
| Scroll-tilted product shot, marquee ticker of real figures | landing |
| Word rise, reveals, count-ups, spring bar fills | everywhere |

`<MotionConfig reducedMotion="user">` and CSS media queries turn the decorative motion off for reduced motion.

## Layout

Landing: 1360px frame, fluid `clamp(16px, 3vw, 40px)` gutter. App — phone (< 768): sticky top bar + floating sticker tab bar; tablet (768–1023): icon rail; desktop (≥ 1024): labelled sidebar. Balance card spans the full row (fixes the old truncated balance at tablet widths). Guest workspaces can return to the landing page (logo link); synced accounts still go straight to the dashboard. Light theme only.
