/** FinTrack mark: an F whose lower stroke breaks into a rising tick, on a lime tile. */
export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="9" fill="#C6F45E" />
      <path d="M9 22.5V9.5h11" fill="none" stroke="#0B0D0C" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 16h6.5" fill="none" stroke="#0B0D0C" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M18.5 22.5l4.5-5" fill="none" stroke="#0B0D0C" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark />
      <span className="font-display text-[17px] font-bold tracking-[-0.03em] text-ink">FinTrack</span>
    </span>
  )
}
