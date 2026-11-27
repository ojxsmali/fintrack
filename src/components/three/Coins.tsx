/**
 * FinTrack's 3D layer. Loaded lazily (see Scene3D.tsx) so three.js never ships
 * with the app shell. Two scenes share one coin:
 *  - <MoneyStacksScene>: the landing hero. This month's money as physical coin
 *    stacks on a turntable, with the brand coin hovering above. Drag to spinRef,
 *    tap a stack to make it jump.
 *  - <BrandCoinScene>: one big coin you can flick into a spinRef (dashboard, brand kit).
 */
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { BRAND, LOGO_BARS } from '../../lib/brandMark'

/* ───────────── shared geometry ───────────── */

const COIN_H = 0.16

function roundedRect(x: number, y: number, w: number, h: number, r: number) {
  const s = new THREE.Shape()
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false)
  s.lineTo(x + w, y + h - r)
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false)
  s.lineTo(x + r, y + h)
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(x, y + r)
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false)
  return s
}

/** The logo's F as extrudable shapes on a unit coin (logo box 32 → radius 1). */
function useLogoGeometry(depth: number) {
  return useMemo(() => {
    const k = 1 / 15
    const toShape = (x: number, y: number, w: number, h: number, r: number) => roundedRect((x - 16) * k, -(y + h - 16) * k, w * k, h * k, r * k)
    const shapes = LOGO_BARS.map((b) => toShape(b.x, b.y, b.w, b.h, b.r))
    const g = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: true, bevelThickness: depth * 0.4, bevelSize: 0.012, bevelSegments: 2, curveSegments: 10 })
    g.translate(0.02, 0, 0)
    return g
  }, [depth])
}

const COIN_COLORS: Record<string, { color: string; metalness: number; roughness: number }> = {
  gold: { color: BRAND.gold, metalness: 0.55, roughness: 0.22 },
  cobalt: { color: BRAND.cobalt, metalness: 0.35, roughness: 0.35 },
  tangerine: { color: BRAND.tangerine, metalness: 0.3, roughness: 0.38 },
  cream: { color: '#f4ead2', metalness: 0.15, roughness: 0.45 },
  ink: { color: '#2a261e', metalness: 0.5, roughness: 0.3 },
}
export type CoinTone = keyof typeof COIN_COLORS

function Studio({ compact }: { compact: boolean }) {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 8, 5]} intensity={1.6} />
      <directionalLight position={[-6, 3, -2]} intensity={0.5} color="#bcd0ff" />
      {/* Local studio environment: no HDR download, works offline. */}
      <Environment resolution={compact ? 64 : 256} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 5, -6]} scale={[12, 3, 1]} />
        <Lightformer form="rect" intensity={2} position={[-6, 1, 2]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#ffe7a8" position={[6, 1, 2]} rotation-y={-Math.PI / 2} scale={[8, 2, 1]} />
        <Lightformer form="ring" intensity={2} position={[0, 6, 3]} scale={3} />
      </Environment>
    </>
  )
}

/* ───────────── the brand coin ───────────── */

function BrandCoin({ spinRef, radius = 1, idle = 0.6 }: { spinRef: MutableRefObject<number>; radius?: number; idle?: number }) {
  const group = useRef<THREE.Group>(null)
  const logo = useLogoGeometry(0.05)
  const rim = useMemo(() => new THREE.TorusGeometry(1, 0.06, 12, 64), [])
  useFrame((state, dt) => {
    const g = group.current
    if (!g) return
    // Flick momentum decays towards a slow idle turn.
    spinRef.current += (idle - spinRef.current) * Math.min(1, dt * 1.4)
    g.rotation.y += spinRef.current * dt
    g.position.y = Math.sin(state.clock.elapsedTime * 1.3) * 0.08
    g.rotation.z = Math.sin(state.clock.elapsedTime * 0.9) * 0.06
  })
  const face = <meshStandardMaterial color="#1b1813" metalness={0.4} roughness={0.35} />
  return (
    <group ref={group} scale={radius}>
      <group rotation-x={Math.PI / 2}>
        <mesh>
          <cylinderGeometry args={[1, 1, 0.2, 72]} />
          <meshStandardMaterial {...COIN_COLORS.gold} />
        </mesh>
        <mesh geometry={rim} position-y={0.1} rotation-x={Math.PI / 2} scale={0.93}>
          <meshStandardMaterial {...COIN_COLORS.gold} roughness={0.18} />
        </mesh>
        <mesh geometry={rim} position-y={-0.1} rotation-x={Math.PI / 2} scale={0.93}>
          <meshStandardMaterial {...COIN_COLORS.gold} roughness={0.18} />
        </mesh>
      </group>
      {/* F on both faces */}
      <mesh geometry={logo} position-z={0.1}>
        {face}
      </mesh>
      <mesh geometry={logo} position-z={-0.1} rotation-y={Math.PI}>
        {face}
      </mesh>
    </group>
  )
}

/** Turns horizontal drags on a DOM element into spinRef velocity, and reports whether the last press was a drag. */
function useFlick(target: MutableRefObject<HTMLElement | null>, spinRef: MutableRefObject<number>, gain = 0.045) {
  const dragged = useRef(false)
  useEffect(() => {
    const el = target.current
    if (!el) return
    let lastX = 0
    let lastT = 0
    let startX = 0
    let down = false
    const onDown = (e: PointerEvent) => {
      down = true
      dragged.current = false
      startX = lastX = e.clientX
      lastT = performance.now()
    }
    const onMove = (e: PointerEvent) => {
      if (!down) return
      const now = performance.now()
      const dx = e.clientX - lastX
      const dt = Math.max(8, now - lastT)
      spinRef.current = THREE.MathUtils.clamp((dx / dt) * 16 * gain * 6, -14, 14)
      lastX = e.clientX
      lastT = now
      if (Math.abs(e.clientX - startX) > 6) dragged.current = true
    }
    const onUp = () => {
      down = false
    }
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [target, spinRef, gain])
  return dragged
}

/** Pauses rendering while the canvas is off screen. */
function useOnScreen(target: MutableRefObject<HTMLElement | null>) {
  const [on, setOn] = useState(true)
  useEffect(() => {
    const el = target.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { rootMargin: '120px' })
    io.observe(el)
    return () => io.disconnect()
  }, [target])
  return on
}

export function BrandCoinScene({ className = '', compact = false, label = 'Drag to spinRef the FinTrack coin' }: { className?: string; compact?: boolean; label?: string }) {
  const wrap = useRef<HTMLDivElement>(null)
  const spinRef = useRef(7) // arrives spinning
  useFlick(wrap, spinRef)
  const onScreen = useOnScreen(wrap)
  return (
    <div ref={wrap} className={`cursor-grab touch-pan-y active:cursor-grabbing ${className}`} role="img" aria-label={label}>
      <Canvas frameloop={onScreen ? 'always' : 'never'} dpr={compact ? [1, 1.5] : [1, 2]} camera={{ position: [0, 0, 4.2], fov: 32 }} gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}>
        <Studio compact />
        <BrandCoin spinRef={spinRef} />
      </Canvas>
    </div>
  )
}

/* ───────────── the hero: money as coin stacks ───────────── */

export interface StackDatum {
  name: string
  amount: number
  /** Pre-formatted money, shown on the sticker above the stack. */
  label: string
  tone: CoinTone
}

interface CoinBody {
  y: number
  v: number
  rest: number
  wobble: number
}

function Stack({
  datum,
  count,
  x,
  z,
  index,
  selected,
  onPick,
  draggedRef,
  calm,
}: {
  datum: StackDatum
  count: number
  x: number
  z: number
  index: number
  selected: boolean
  onPick: (i: number) => void
  draggedRef: MutableRefObject<boolean>
  calm: boolean
}) {
  const meshes = useRef<(THREE.Mesh | null)[]>([])
  const group = useRef<THREE.Group>(null)
  const [hover, setHover] = useState(false)
  // Per-coin physics state lives in a ref: useFrame mutates it 60×/s without re-rendering.
  const [initial] = useState<CoinBody[]>(() =>
    Array.from({ length: count }, (_, i) => {
      const rest = i * COIN_H + COIN_H / 2
      return { rest, y: calm ? rest : rest + 5 + i * 0.35 + index * 0.9, v: 0, wobble: Math.sin(i * 12.99 + index * 78.2) * 0.06 }
    }),
  )
  const bodiesRef = useRef(initial)
  const geo = useMemo(() => new THREE.CylinderGeometry(0.5, 0.5, COIN_H * 0.92, 48), [])
  const mat = COIN_COLORS[datum.tone]

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30)
    bodiesRef.current.forEach((b, i) => {
      // Gravity + a bouncy floor at each coin's resting height.
      b.v -= 22 * dt
      b.y += b.v * dt
      if (b.y < b.rest) {
        b.y = b.rest
        b.v = Math.abs(b.v) > 1.2 ? -b.v * 0.38 : 0
      }
      const m = meshes.current[i]
      if (m) {
        m.position.y = b.y
        m.rotation.z = b.wobble * Math.min(1, (b.y - b.rest) * 2)
      }
    })
    const g = group.current
    if (g) {
      const lift = hover || selected ? 0.18 : 0
      g.position.y += (lift - g.position.y) * Math.min(1, rawDt * 10)
    }
  })

  const jump = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (draggedRef.current) return
    bodiesRef.current.forEach((b, i) => {
      b.v = 4.5 + i * 0.32
    })
    onPick(index)
  }

  return (
    <group position={[x, 0, z]}>
      <group
        ref={group}
        onClick={jump}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHover(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHover(false)
          document.body.style.cursor = ''
        }}
      >
        {initial.map((b, i) => (
          <mesh
            key={i}
            ref={(m) => {
              meshes.current[i] = m
            }}
            geometry={geo}
            position={[0, b.y, 0]}
          >
            <meshStandardMaterial color={mat.color} metalness={mat.metalness} roughness={mat.roughness} emissive={selected ? mat.color : '#000'} emissiveIntensity={selected ? 0.18 : 0} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function Turntable({
  data,
  spinRef,
  selected,
  onPick,
  draggedRef,
  compact,
  calm,
  labelRefs,
}: {
  data: StackDatum[]
  spinRef: MutableRefObject<number>
  selected: number
  onPick: (i: number) => void
  draggedRef: MutableRefObject<boolean>
  compact: boolean
  calm: boolean
  labelRefs: MutableRefObject<(HTMLDivElement | null)[]>
}) {
  const table = useRef<THREE.Group>(null)
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const coinSpinRef = useRef(5)
  const maxCoins = compact ? 11 : 16
  const max = Math.max(...data.map((d) => d.amount), 1)
  const radius = compact ? 1.75 : 2.15

  useFrame((state, dt) => {
    const t = table.current
    if (!t) return
    // Drag momentum, decaying to a slow showroom turn.
    const idle = calm ? 0 : 0.12
    spinRef.current += (idle - spinRef.current) * Math.min(1, dt * 1.6)
    t.rotation.y += spinRef.current * dt
    coinSpinRef.current = Math.max(coinSpinRef.current, Math.abs(spinRef.current) * 3)
    if (!compact) {
      // Gentle parallax toward the pointer.
      state.camera.position.x += (state.pointer.x * 0.6 - state.camera.position.x) * Math.min(1, dt * 2)
      state.camera.lookAt(0, 1.5, 0)
    }
    // Pin each DOM sticker above its stack (plain DOM writes, no React renders).
    const { width, height } = state.size
    data.forEach((d, i) => {
      const el = labelRefs.current[i]
      if (!el) return
      const a = (i / data.length) * Math.PI * 2 + t.rotation.y
      const count = Math.max(2, Math.round((d.amount / max) * maxCoins))
      tmp.set(Math.sin(a) * radius, count * COIN_H + 0.45 + (selected === i ? 0.18 : 0), Math.cos(a) * radius).project(state.camera)
      el.style.transform = `translate(-50%, -100%) translate(${((tmp.x + 1) / 2) * width}px, ${((1 - tmp.y) / 2) * height}px)`
      el.style.zIndex = String(Math.round((1 - tmp.z) * 1000))
      el.style.opacity = '1'
    })
  })

  return (
    <>
      <group ref={table}>
        {/* plinth */}
        <mesh position-y={-0.09}>
          <cylinderGeometry args={[radius + 0.85, radius + 0.95, 0.18, 96]} />
          <meshStandardMaterial color="#16140f" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position-y={0.002} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[radius + 0.55, radius + 0.62, 96]} />
          <meshBasicMaterial color={BRAND.gold} />
        </mesh>
        {data.map((d, i) => {
          const a = (i / data.length) * Math.PI * 2
          const count = Math.max(2, Math.round((d.amount / max) * maxCoins))
          return <Stack key={`${d.name}-${count}-${calm}`} datum={d} count={count} x={Math.sin(a) * radius} z={Math.cos(a) * radius} index={i} selected={selected === i} onPick={onPick} draggedRef={draggedRef} calm={calm} />
        })}
      </group>
      <group position={[0, compact ? 3.25 : 3.3, -0.9]}>
        <BrandCoin spinRef={coinSpinRef} radius={compact ? 0.62 : 0.72} idle={calm ? 0 : 1.1} />
      </group>
    </>
  )
}

export function MoneyStacksScene({
  data,
  selected,
  onPick,
  compact = false,
  calm = false,
  className = '',
}: {
  data: StackDatum[]
  selected: number
  onPick: (i: number) => void
  compact?: boolean
  calm?: boolean
  className?: string
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const spinRef = useRef(calm ? 0 : 2.4)
  const dragged = useFlick(wrap, spinRef, 0.03)
  const labelRefs = useRef<(HTMLDivElement | null)[]>([])
  const onScreen = useOnScreen(wrap)
  return (
    <div ref={wrap} className={`relative cursor-grab touch-pan-y active:cursor-grabbing ${className}`}>
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden>
        {data.map((d, i) => (
          <div
            key={d.name}
            ref={(el) => {
              labelRefs.current[i] = el
            }}
            className={`absolute left-0 top-0 opacity-0 transition-opacity duration-500 will-change-transform ${compact && selected !== i ? 'invisible' : ''}`}
          >
            <div
              className={`whitespace-nowrap rounded-[8px] border-2 border-ink px-2 py-1 text-center font-mono text-[11px] font-semibold leading-tight shadow-[3px_3px_0_#16140f] transition-[transform,background-color,color] duration-300 ease-[var(--ease-spring)] ${
                selected === i ? 'scale-110 bg-ink text-accent' : 'bg-surface text-ink'
              }`}
            >
              <div className="uppercase tracking-[0.06em] opacity-70">{d.name}</div>
              <div className="num text-[12px]">{d.label}</div>
            </div>
          </div>
        ))}
      </div>
      <Canvas
        frameloop={onScreen ? 'always' : 'never'}
        dpr={compact ? [1, 1.5] : [1, 2]}
        camera={{ position: [0, compact ? 6.2 : 5.6, compact ? 9.2 : 8.4], fov: compact ? 38 : 34 }}
        gl={{ antialias: !compact, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ camera }) => camera.lookAt(0, 1.5, 0)}
      >
        <Studio compact={compact} />
        <Turntable data={data} spinRef={spinRef} selected={selected} onPick={onPick} draggedRef={dragged} compact={compact} calm={calm} labelRefs={labelRefs} />
        <ContactShadows position={[0, -0.19, 0]} opacity={0.45} scale={12} blur={2.4} far={4} resolution={compact ? 256 : 512} color="#16140f" />
      </Canvas>
    </div>
  )
}
