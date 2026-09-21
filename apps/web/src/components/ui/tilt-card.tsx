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
export function TiltCard({ className, children }: { className?: string; children: React.ReactNode }) {
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

  if (reduced || !canHover) {
    return <div data-tilt="off" className={className}>{children}</div>;
  }

  return (
    <motion.div
      data-tilt="on"
      className={cn('relative [transform-style:preserve-3d]', className)}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={(e) => {
        const t = tiltFromPointer(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
        rx.set(t.rotateX);
        ry.set(t.rotateY);
        glare.current?.style.setProperty('--gx', `${t.glareX}%`);
        glare.current?.style.setProperty('--gy', `${t.glareY}%`);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
    >
      {children}
      <div
        ref={glare}
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[var(--radius-card)] opacity-0 transition-opacity duration-300 [.group:hover_&]:opacity-100 [background:radial-gradient(circle_at_var(--gx,50%)_var(--gy,50%),rgba(34,229,255,0.18),transparent_55%)]"
      />
    </motion.div>
  );
}
