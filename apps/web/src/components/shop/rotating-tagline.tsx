'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

const TYPE_MS = 55;
const DELETE_MS = 30;
const HOLD_MS = 1400;

/** Typewriter-style rotating line: "Shop [phrase]|" cycling through `phrases`. */
export function RotatingTagline({ prefix, phrases }: { prefix: string; phrases: string[] }) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState(reduceMotion ? phrases[0] ?? '' : '');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (reduceMotion || phrases.length === 0) return;
    const current = phrases[index % phrases.length];

    if (!deleting && typed === current) {
      const hold = setTimeout(() => setDeleting(true), HOLD_MS);
      return () => clearTimeout(hold);
    }
    if (deleting && typed === '') {
      setDeleting(false);
      setIndex((i) => (i + 1) % phrases.length);
      return;
    }

    const step = setTimeout(
      () => setTyped((t) => (deleting ? current.slice(0, t.length - 1) : current.slice(0, t.length + 1))),
      deleting ? DELETE_MS : TYPE_MS,
    );
    return () => clearTimeout(step);
  }, [typed, deleting, index, phrases, reduceMotion]);

  if (phrases.length === 0) return null;

  return (
    <p className="text-sm md:text-base font-medium text-[color:var(--fg-muted)]">
      {prefix} <span className="text-[color:var(--fg)]">{reduceMotion ? phrases[0] : typed}</span>
      <motion.span
        aria-hidden
        className="inline-block w-[2px] h-[1em] ml-0.5 align-middle bg-[color:var(--accent)]"
        animate={reduceMotion ? { opacity: 1 } : { opacity: [1, 1, 0, 0] }}
        transition={reduceMotion ? undefined : { duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
      />
    </p>
  );
}
