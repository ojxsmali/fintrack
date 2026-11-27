/** Brand colours and the logo geometry, shared by the SVG mark, the 3D coin and the brand kit. */
export const BRAND = {
  gold: '#FFC21A',
  ink: '#16140F',
  cream: '#F3EEE2',
  cobalt: '#2F5BFF',
  tangerine: '#FF6A2B',
}

/**
 * The F, in a 32×32 box centred on the coin: a stem, a long top arm and a shorter
 * middle arm. Exactly two arms, so it can never read as an E. Corners are softened
 * (r), not pill-rounded, to keep the letterform crisp.
 */
export const LOGO_BARS = [
  { x: 10, y: 8, w: 4.6, h: 16, r: 1.4 }, // stem
  { x: 10, y: 8, w: 12.6, h: 4.6, r: 1.4 }, // top arm
  { x: 10, y: 14.3, w: 9.4, h: 4.2, r: 1.4 }, // middle arm
]
