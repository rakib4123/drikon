'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { tiltFromPointer } from '@/lib/tilt';
import { cn } from '@/lib/utils';

const spring = { stiffness: 300, damping: 30 };

/**
 * CSS 3D tilt with a cursor-following glare. Off on touch/coarse pointers and
 * under reduced motion — then it renders a plain wrapper with no transform.
 */
export function TiltCard({
  className,
  children,
  max = 5,
}: {
  className?: string;
  children: React.ReactNode;
  /** Maximum tilt in degrees (spec: 5°). */
  max?: number;
}) {
  const reduced = useReducedMotion();
  const [canHover, setCanHover] = useState(false);
  const glare = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const rotateX = useSpring(rx, spring);
  const rotateY = useSpring(ry, spring);

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sync = () => setCanHover(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Always the same element (motion.div) so toggling `enabled` — canHover
  // resolving after mount, or reduced-motion changing — never remounts the
  // card's subtree. Only the transform-driving bits (spring style, pointer
  // handlers, glare) are conditional; `data-tilt` keeps its on/off semantics.
  const enabled = !reduced && canHover;

  return (
    <motion.div
      data-tilt={enabled ? 'on' : 'off'}
      className={cn('relative [transform-style:preserve-3d]', className)}
      style={enabled ? { rotateX, rotateY, transformPerspective: 900 } : undefined}
      onPointerMove={
        enabled
          ? (e) => {
              const t = tiltFromPointer(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect(), max);
              rx.set(t.rotateX);
              ry.set(t.rotateY);
              glare.current?.style.setProperty('--gx', `${t.glareX}%`);
              glare.current?.style.setProperty('--gy', `${t.glareY}%`);
            }
          : undefined
      }
      onPointerLeave={
        enabled
          ? () => {
              rx.set(0);
              ry.set(0);
            }
          : undefined
      }
    >
      {children}
      {enabled && (
        <div
          ref={glare}
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[var(--radius-card)] opacity-0 transition-opacity duration-300 [.group:hover_&]:opacity-100 [background:radial-gradient(circle_at_var(--gx,50%)_var(--gy,50%),rgba(34,229,255,0.18),transparent_55%)]"
        />
      )}
    </motion.div>
  );
}
