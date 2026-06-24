# drikon — Project Instructions

E-commerce storefront. pnpm + Turborepo monorepo.

## Stack
- **Next.js 15** — App Router only (no `pages/`). Server Components by default.
- **React 19** — `ref` is a normal prop; do NOT use `forwardRef` for new components.
- **Tailwind CSS v4 (beta)** — CSS-first config. There is NO `tailwind.config.js`. Tokens live in `@theme {}` inside the global CSS. Entry is `@import "tailwindcss";`.
- **Motion 11** (`motion`, the successor to `framer-motion`) — for all animation.

## Monorepo layout
- `apps/` — deployable apps (the storefront lives here).
- `packages/` — shared code (UI components, config, utils).
- Managed by `pnpm` workspaces + `turbo`. Never run raw `npm`.

## Commands
- Install: `pnpm install`
- Dev: `pnpm dev` (runs `turbo dev`)
- Build: `pnpm build`
- Lint: `pnpm lint`
- Add a dep to one workspace: `pnpm --filter <app-or-pkg> add <dep>`

## Animation rules (Motion 11)
- Import from `motion/react`, NOT `framer-motion`:
  `import { motion, AnimatePresence } from "motion/react"`
- Any file using `motion.*`, hooks, or `AnimatePresence` MUST start with `"use client"`. Keep these as small leaf components so the rest of the tree stays a Server Component.
- Prefer `variants` over inline `animate` props for anything with more than one state.
- Default transition for UI: spring (`{ type: "spring", stiffness: 300, damping: 30 }`). Use `ease: "easeOut"` tweens only for simple fades.
- Entrance pattern: fade + small rise — `initial={{ opacity: 0, y: 12 }}` → `animate={{ opacity: 1, y: 0 }}`.
- Respect reduced motion: wrap motion-heavy UI with `useReducedMotion()` and drop transforms when it returns true.
- Never animate `width`/`height`/`top`/`left`. Animate `transform` and `opacity` only.

## Styling rules (Tailwind v4)
- Add design tokens (colors, spacing, fonts) in `@theme {}` in the global CSS, not a JS config file.
- Use utility classes directly in JSX. For variant-heavy components use `clsx` + `tailwind-merge` (via a `cn()` helper) — do not hand-concatenate class strings.
- Mobile-first: base styles for mobile, layer `sm: md: lg:` upward.

## Component conventions
- Shared, reusable UI → `packages/` so all apps can import it. App-specific UI stays in the app.
- TypeScript everywhere. Props typed with explicit `type` definitions, no `any`.
- Server Component by default. Add `"use client"` ONLY when the component needs state, effects, event handlers, or Motion.
- Keep files focused: one component per file, colocate its variants.

## Magic MCP (/ui) generated components
- After generating, refactor to match the rules above before committing: convert to `motion/react` imports, add `"use client"` if it animates, replace any inline config with our `@theme` tokens, and ensure TypeScript types.
- Generated components are starting points, not final — review for the spring/transition defaults and reduced-motion handling.

## Don'ts
- No `framer-motion` imports (it's `motion/react` now).
- No `tailwind.config.js` edits — use `@theme`.
- No `pages/` directory or `getServerSideProps` — App Router patterns only.
- No `npm`/`yarn` — pnpm only.
