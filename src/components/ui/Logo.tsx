/**
 * FinTrack mark: a gold coin with an ink rim, carrying a crisp geometric F
 * (one stem, two arms). Geometry lives in lib/brandMark.ts so the 3D coin, favicon
 * and brand kit all share one drawing.
 */
import { BRAND, LOGO_BARS } from '../../lib/brandMark'

export function LogoMark({ size = 28, tone = 'gold' }: { size?: number; tone?: 'gold' | 'ink' | 'cream' }) {
  const face = tone === 'gold' ? BRAND.gold : tone === 'ink' ? BRAND.ink : BRAND.cream
  const fg = tone === 'ink' ? BRAND.gold : BRAND.ink
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden className="block overflow-visible">
      {/* hard shadow */}
      <circle cx="18.5" cy="18.5" r="15" fill={BRAND.ink} />
      <circle cx="16" cy="16" r="15" fill={face} stroke={BRAND.ink} strokeWidth="2.2" />
      {/* milled inner rim */}
      <circle cx="16" cy="16" r="11.6" fill="none" stroke={fg} strokeOpacity="0.35" strokeWidth="1.1" strokeDasharray="1.4 1.6" />
      {LOGO_BARS.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={b.r} fill={fg} />
      ))}
    </svg>
  )
}

export function Wordmark({ className = '', size = 28 }: { className?: string; size?: number }) {
  return (
    <span className={`ft-coin-flip inline-flex items-center gap-2.5 [perspective:400px] ${className}`}>
      <LogoMark size={size} />
      <span className="font-display text-[17px] font-extrabold tracking-[-0.04em] text-ink">
        FinTrack<span className="text-accent-ink">.</span>
      </span>
    </span>
  )
}
