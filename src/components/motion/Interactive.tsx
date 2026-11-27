/**
 * Interactive motion built on `motion` (Framer Motion). Everything here respects
 * the OS reduced-motion setting through <MotionConfig reducedMotion="user"> in App.
 */
import { motion, useMotionValue, useSpring, useTransform, type HTMLMotionProps } from 'motion/react'
import { useRef, useSyncExternalStore, type ReactNode } from 'react'

const SPRING = { stiffness: 380, damping: 26, mass: 0.6 }

// Drag-to-throw only makes sense with a mouse. On touch screens it hijacks scrolling,
// so phones and tablets get a plain card with a press squash instead.
const FINE = '(hover: hover) and (pointer: fine)'
const subscribeFine = (cb: () => void) => {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mq = window.matchMedia(FINE)
  mq.addEventListener?.('change', cb)
  return () => mq.removeEventListener?.('change', cb)
}
const readFine = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(FINE).matches : true)
function useFinePointer() {
  return useSyncExternalStore(subscribeFine, readFine, () => true)
}

/**
 * A card you can grab and pull; let go and it springs back to its place.
 * Tilts toward the direction of the pull, lifts while held.
 */
export function PullCard({ children, className = '', rotate = 0, ...rest }: HTMLMotionProps<'div'> & { rotate?: number; children: ReactNode }) {
  const x = useMotionValue(0)
  const tilt = useTransform(x, [-160, 160], [rotate - 10, rotate + 10])
  const fine = useFinePointer()
  if (!fine)
    return (
      <motion.div whileTap={{ scale: 0.98 }} style={{ rotate }} className={className} {...rest}>
        {children}
      </motion.div>
    )
  return (
    <motion.div
      drag
      dragSnapToOrigin
      dragElastic={0.55}
      dragTransition={{ bounceStiffness: 420, bounceDamping: 14 }}
      whileDrag={{ scale: 1.05, zIndex: 30, cursor: 'grabbing' }}
      whileHover={{ y: -6 }}
      style={{ x, rotate: tilt, touchAction: 'none' }}
      className={`cursor-grab select-none ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

/** Leans its child toward the cursor (magnetic button), springing back when the pointer leaves. */
export function Magnetic({ children, strength = 0.35, className = '' }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useSpring(0, SPRING)
  const y = useSpring(0, SPRING)
  return (
    <motion.div
      ref={ref}
      className={`inline-flex ${className}`}
      style={{ x, y }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse' || !ref.current) return
        const r = ref.current.getBoundingClientRect()
        x.set((e.clientX - (r.left + r.width / 2)) * strength)
        y.set((e.clientY - (r.top + r.height / 2)) * strength)
      }}
      onPointerLeave={() => {
        x.set(0)
        y.set(0)
      }}
    >
      {children}
    </motion.div>
  )
}

/** 3D tilt toward the pointer with a spring, for showcase panels. */
export function TiltCard({ children, className = '', max = 8 }: { children: ReactNode; className?: string; max?: number }) {
  const rx = useSpring(0, SPRING)
  const ry = useSpring(0, SPRING)
  return (
    <motion.div
      className={className}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1200 }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return
        const r = e.currentTarget.getBoundingClientRect()
        ry.set(((e.clientX - r.left) / r.width - 0.5) * max * 2)
        rx.set(-((e.clientY - r.top) / r.height - 0.5) * max * 2)
      }}
      onPointerLeave={() => {
        rx.set(0)
        ry.set(0)
      }}
    >
      {children}
    </motion.div>
  )
}
