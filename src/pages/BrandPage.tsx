import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, Copy, Download } from 'lucide-react'
import { LogoMark, Wordmark } from '../components/ui/Logo'
import { BRAND, LOGO_BARS } from '../lib/brandMark'
import { Button } from '../components/ui/Button'
import { BrandCoin3D } from '../components/three/Scene3D'
import { Reveal } from '../components/motion/Motion'
import { PullCard } from '../components/motion/Interactive'
import { AuthorCredit } from '../components/layout/AuthorCredit'

const FRAME = 'mx-auto w-full max-w-[1240px] px-[clamp(16px,3vw,40px)]'

type Tone = 'gold' | 'ink' | 'cream'

/** Same drawing as <LogoMark>, as a standalone SVG file. */
function logoSvg(tone: Tone, size = 512) {
  const face = tone === 'gold' ? BRAND.gold : tone === 'ink' ? BRAND.ink : BRAND.cream
  const fg = tone === 'ink' ? BRAND.gold : BRAND.ink
  const bars = LOGO_BARS.map((b) => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${b.r}" fill="${fg}"/>`)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 34 34"><circle cx="18.5" cy="18.5" r="15" fill="${BRAND.ink}"/><circle cx="16" cy="16" r="15" fill="${face}" stroke="${BRAND.ink}" stroke-width="2.2"/><circle cx="16" cy="16" r="11.6" fill="none" stroke="${fg}" stroke-opacity="0.35" stroke-width="1.1" stroke-dasharray="1.4 1.6"/>${bars.join('')}</svg>`
}

function download(name: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type: 'image/svg+xml' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const COLOURS: { name: string; hex: string; role: string; text: string; ratio: string; bg: string }[] = [
  { name: 'Gold', hex: '#FFC21A', role: 'Money, the primary action, the coin', text: 'text-ink', ratio: 'Ink on gold 11.4:1', bg: 'bg-accent' },
  { name: 'Ink', hex: '#16140F', role: 'Type, outlines, hard shadows', text: 'text-paper', ratio: 'On cream 15.9:1', bg: 'bg-ink' },
  { name: 'Cream', hex: '#F3EEE2', role: 'Paper: every page sits on it', text: 'text-ink', ratio: 'Base surface', bg: 'bg-paper' },
  { name: 'Cobalt', hex: '#2F5BFF', role: 'Income, links, focus rings', text: 'text-white', ratio: 'White on cobalt 5.2:1', bg: 'bg-cobalt' },
  { name: 'Tangerine', hex: '#FF6A2B', role: 'Spending, warnings with energy', text: 'text-ink', ratio: 'Ink on tangerine 6.4:1', bg: 'bg-tangerine' },
  { name: 'Mint ink', hex: '#0E7A4B', role: 'Saved, under budget', text: 'text-white', ratio: 'White on it 5.4:1', bg: 'bg-positive' },
  { name: 'Brick', hex: '#C42B1C', role: 'Overspent, errors', text: 'text-white', ratio: 'White on it 5.7:1', bg: 'bg-negative' },
]

export function BrandPage() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper/90 backdrop-blur-md">
        <div className={`${FRAME} flex h-16 items-center justify-between`}>
          <Link to="/" aria-label="FinTrack home">
            <Wordmark />
          </Link>
          <Link to="/" className="ft-press ft-push inline-flex h-10 items-center gap-2 rounded-full bg-surface px-4 text-sm font-semibold">
            <ArrowLeft size={15} aria-hidden /> Back to site
          </Link>
        </div>
      </header>

      <main>
        {/* Cover */}
        <section className={`${FRAME} grid items-center gap-8 py-12 lg:grid-cols-2 lg:py-20`}>
          <div>
            <p className="ft-label">Brand kit · v4 · 2026</p>
            <h1 className="ft-display mt-5 text-[clamp(2.8rem,8vw,6.5rem)] text-ink">
              Fin<span className="ft-serif">Track</span>
              <br />
              brand kit
            </h1>
            <p className="mt-6 max-w-md text-lg text-ink-2">Money you can pick up. One gold coin, heavy ink, cream paper, and motion that answers back when you touch it.</p>
          </div>
          <div className="relative aspect-square max-h-[520px] w-full overflow-hidden rounded-[28px] border-2 border-ink bg-[radial-gradient(circle_at_50%_40%,#fff8df,#efe4c6_75%)] shadow-[8px_8px_0_#16140f]">
            <BrandCoin3D className="absolute inset-0" label="The FinTrack coin in 3D: drag to spin" fallback={<div className="grid h-full place-items-center"><LogoMark size={260} /></div>} />
            <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-ink px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-paper">Flick it</p>
          </div>
        </section>

        <Block index="01" title="The mark" lede="A gold coin stamped with a crisp geometric F: one stem, two arms, softened corners. Always on its hard shadow.">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ['Primary', 'gold', 'bg-paper'],
                ['On gold', 'cream', 'bg-accent'],
                ['Reversed', 'ink', 'bg-ink'],
                ['Mono', 'cream', 'bg-surface'],
              ] as [string, Tone, string][]
            ).map(([label, tone, bg]) => (
              <div key={label} className="overflow-hidden rounded-[20px] border-2 border-ink shadow-[5px_5px_0_#16140f]">
                <div className={`grid aspect-[4/3] place-items-center ${bg}`}>
                  <PullCard>
                    <LogoMark size={110} tone={tone} />
                  </PullCard>
                </div>
                <div className="flex items-center justify-between border-t-2 border-ink bg-surface px-4 py-3">
                  <span className="text-sm font-semibold">{label}</span>
                  <button type="button" onClick={() => download(`fintrack-mark-${tone}.svg`, logoSvg(tone))} className="ft-press inline-flex items-center gap-1 rounded-full border-2 border-ink px-2.5 py-1 text-xs font-semibold hover:bg-accent">
                    <Download size={12} aria-hidden /> SVG
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <Card title="Lock-up">
              <div className="flex flex-wrap items-center gap-8 py-4">
                <Wordmark size={44} className="[&>span:last-child]:text-[30px]" />
                <Wordmark />
              </div>
              <p className="text-sm text-ink-3">Wordmark in Unbounded ExtraBold, −4% tracking, with a gold full stop. Clear space around the lock-up is one coin radius.</p>
            </Card>
            <Card title="Don’t">
              <ul className="grid gap-2 text-sm text-ink-2">
                {['Stretch, rotate or outline the coin', 'Drop the hard shadow or blur it', 'Put the gold coin on gold', 'Recolour the F anything but ink (or gold on ink)'].map((d) => (
                  <li key={d} className="flex items-start gap-2">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-negative text-[11px] font-bold text-white">×</span>
                    {d}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </Block>

        <Block index="02" title="Colour" lede="Gold means money. Ink draws everything. Cobalt and tangerine split income from spending in every chart. Tap a swatch to copy it.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {COLOURS.map((c, i) => (
              <Swatch key={c.hex} {...c} big={i < 2} />
            ))}
          </div>
        </Block>

        <Block index="03" title="Type" lede="Three voices, each with one job.">
          <div className="grid gap-5">
            <Card title="Unbounded · display">
              <p className="font-display text-[clamp(2.4rem,7vw,5.5rem)] font-extrabold leading-[0.95] tracking-[-0.045em]">₹41,709 kept.</p>
              <p className="mt-3 text-sm text-ink-3">Headlines, figures that matter, the wordmark. ExtraBold, tight tracking.</p>
            </Card>
            <div className="grid gap-5 md:grid-cols-2">
              <Card title="Geist · interface">
                <p className="text-2xl font-semibold tracking-[-0.02em]">Every rupee in and out, made visible.</p>
                <p className="mt-3 text-sm text-ink-3">Body copy, labels, forms, tables. Tabular figures on every number.</p>
              </Card>
              <Card title="JetBrains Mono · data">
                <p className="font-mono text-lg font-semibold uppercase tracking-[0.06em]">Fig. 1 · 45% saved</p>
                <p className="mt-3 text-sm text-ink-3">Section markers, captions, chart labels and readouts.</p>
              </Card>
            </div>
          </div>
        </Block>

        <Block index="04" title="Touch & motion" lede="Everything answers back. Press these.">
          <div className="grid gap-5 md:grid-cols-3">
            <Card title="Pushable buttons">
              <div className="flex flex-wrap gap-3">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ink">Ink</Button>
              </div>
              <p className="mt-4 text-sm text-ink-3">Sits on a 3px shadow; presses flat in 60ms.</p>
            </Card>
            <Card title="Throwable cards · mouse only">
              <PullCard rotate={-3} className="inline-block">
                <div className="rounded-[16px] border-2 border-ink bg-accent px-5 py-4 font-display font-extrabold shadow-[4px_4px_0_#16140f]">Drag me</div>
              </PullCard>
              <p className="mt-4 text-sm text-ink-3">Spring back with bounce stiffness 420, damping 14. Touch screens get a press instead, so scrolling never gets hijacked.</p>
            </Card>
            <Card title="3D coin">
              <p className="text-sm text-ink-3">Coins drop onto the landing turntable with gravity and a 0.38 bounce. Flick to spin; it slows back to an idle turn. Phones get fewer coins and a lower pixel ratio. Reduced motion stops the idle turn and the drop.</p>
            </Card>
          </div>
        </Block>

        <Block index="05" title="Voice" lede="Plain, warm, specific. Talk about money the way a sharp friend would.">
          <div className="grid gap-5 md:grid-cols-2">
            <Card title="Say">
              <ul className="grid gap-2 text-base font-semibold">
                <li>“You kept ₹41,709 in November.”</li>
                <li>“Groceries is ₹450 over its budget.”</li>
                <li>“Press N to add a transaction.”</li>
              </ul>
            </Card>
            <Card title="Not">
              <ul className="grid gap-2 text-base text-ink-3 line-through decoration-negative decoration-2">
                <li>“Unlock your financial potential.”</li>
                <li>“Seamlessly empower your wealth journey.”</li>
                <li>“AI-powered insights at your fingertips.”</li>
              </ul>
            </Card>
          </div>
        </Block>
      </main>

      <footer className="mt-24 border-t-2 border-ink bg-surface">
        <div className={`${FRAME} flex flex-wrap items-center justify-between gap-4 py-10`}>
          <Wordmark />
          <AuthorCredit className="text-sm text-ink-3" />
        </div>
      </footer>
    </div>
  )
}

function Block({ index, title, lede, children }: { index: string; title: string; lede: string; children: ReactNode }) {
  return (
    <section className={`${FRAME} pt-20`} aria-labelledby={`brand-${index}`}>
      <Reveal>
        <div className="flex flex-col gap-4 border-t-2 border-ink pt-6 md:flex-row md:items-end md:justify-between">
          <h2 id={`brand-${index}`} className="ft-display text-[clamp(2rem,5vw,3.6rem)]">
            <span className="mr-3 align-middle font-mono text-base font-semibold text-ink-3">{index}</span>
            {title}
          </h2>
          <p className="max-w-md text-base text-ink-2">{lede}</p>
        </div>
      </Reveal>
      <div className="mt-10">{children}</div>
    </section>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[20px] border-2 border-ink bg-surface p-6 shadow-[5px_5px_0_#16140f]">
      <p className="ft-label mb-4">{title}</p>
      {children}
    </div>
  )
}

function Swatch({ name, hex, role, text, ratio, bg, big }: { name: string; hex: string; role: string; text: string; ratio: string; bg: string; big?: boolean }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(hex)
        } catch {
          /* clipboard blocked: the hex is on screen anyway */
        }
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      }}
      className={`ft-press group flex flex-col justify-between rounded-[20px] border-2 border-ink p-5 text-left shadow-[5px_5px_0_#16140f] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[7px_9px_0_#16140f] active:translate-x-1 active:translate-y-1 active:shadow-none ${bg} ${text} ${big ? 'col-span-2 min-h-56' : 'min-h-44'}`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className={`font-display font-extrabold tracking-[-0.03em] ${big ? 'text-3xl' : 'text-xl'}`}>{name}</span>
        <span className="grid size-8 place-items-center rounded-full border-2 border-current opacity-70 group-hover:opacity-100">{copied ? <Check size={14} aria-hidden /> : <Copy size={13} aria-hidden />}</span>
      </span>
      <span>
        <span className="block font-mono text-sm font-semibold">{copied ? 'Copied!' : hex}</span>
        <span className="mt-1 block text-xs opacity-80">{role}</span>
        <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.06em] opacity-70">{ratio}</span>
      </span>
    </button>
  )
}
