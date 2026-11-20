/** FinTrack mark: an F whose lower stroke breaks into a rising tick. */
export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="7" fill="#1A1A18" />
      <path d="M9 22.5V9.5h11" fill="none" stroke="#F6F4EF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 16h6.5" fill="none" stroke="#F6F4EF" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M18.5 22.5l4.5-5" fill="none" stroke="#7FB3BF" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-[-0.02em] text-ink">FinTrack</span>
    </span>
  )
}
