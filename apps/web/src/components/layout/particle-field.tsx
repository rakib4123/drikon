'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';

const LINK_DISTANCE = 150;
const CURSOR_DISTANCE = 190;
const MAX_PARTICLES = 160;
const DRIFT_SPEED = 0.15;

type Particle = { x: number; y: number; vx: number; vy: number };

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.trim().replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/** Ambient neuron-style particle network — drifts behind the whole site, links to nearby particles and the cursor. */
export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const styles = getComputedStyle(document.documentElement);
    const [fr, fg, fb] = hexToRgb(styles.getPropertyValue('--fg') || '#151515');
    const [br, bg, bb] = hexToRgb(styles.getPropertyValue('--border') || '#e5e2da');

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let particles: Particle[] = [];
    const mouse = { x: -9999, y: -9999 };
    let frameId = 0;
    let running = true;

    function resize() {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(MAX_PARTICLES, Math.round((width * height) / 9000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * DRIFT_SPEED,
        vy: (Math.random() - 0.5) * DRIFT_SPEED,
      }));
    }

    function step() {
      if (!running) return;
      ctx!.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < LINK_DISTANCE) {
            const alpha = 0.22 * (1 - dist / LINK_DISTANCE);
            ctx!.strokeStyle = `rgba(${br}, ${bg}, ${bb}, ${alpha})`;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }

        const dCursor = Math.hypot(particles[i].x - mouse.x, particles[i].y - mouse.y);
        if (dCursor < CURSOR_DISTANCE) {
          const alpha = 0.4 * (1 - dCursor / CURSOR_DISTANCE);
          ctx!.strokeStyle = `rgba(${fr}, ${fg}, ${fb}, ${alpha})`;
          ctx!.beginPath();
          ctx!.moveTo(particles[i].x, particles[i].y);
          ctx!.lineTo(mouse.x, mouse.y);
          ctx!.stroke();
        }

        ctx!.fillStyle = `rgba(${fr}, ${fg}, ${fb}, 0.5)`;
        ctx!.beginPath();
        ctx!.arc(particles[i].x, particles[i].y, 2, 0, Math.PI * 2);
        ctx!.fill();
      }

      frameId = requestAnimationFrame(step);
    }

    function onPointerMove(e: PointerEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }

    function onVisibilityChange() {
      running = document.visibilityState === 'visible';
      if (running) frameId = requestAnimationFrame(step);
      else cancelAnimationFrame(frameId);
    }

    resize();
    frameId = requestAnimationFrame(step);
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      running = false;
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [reduceMotion]);

  if (reduceMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
}
