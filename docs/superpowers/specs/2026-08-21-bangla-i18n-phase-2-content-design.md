# Bangla/English Full-Site Translation — Phase 2 Design Spec

**Date:** 2026-08-21
**Status:** Approved for planning
**Driver:** Phase 1 (shipped) translated only the storefront's static UI chrome (nav, search, home headings, buttons, PDP labels) via `next-intl` JSON message files. Everything else — product names/descriptions, category names/descriptions, banner copy, and the About/Contact/Terms/Privacy/Shipping pages — is still English-only, and a handful of pre-existing robotics products (e.g. "Otto Bot") are Bangla-only with no English version at all. The user wants the full customer-facing site genuinely bilingual.

## Goal

Every piece of customer-facing content — product data, category data, banner copy, and the five static informational pages — renders in real, human-quality Bangla when the site is switched to Bangla, with a graceful English fallback for any individual item not yet translated. Search works correctly when a customer types in Bangla script.

## Non-goals

- **Admin panel UI chrome stays English-only.** Confirmed explicitly — admins work in English. This phase only adds Bangla *content fields* to admin edit forms, it does not translate the admin interface itself.
- **No machine translation / no new external API dependency.** All translated content is hand-written to the same quality bar as Phase 1, consistent with the project's preference for no new paid integrations (see the Apriori spec's Non-goals on avoiding unnecessary infrastructure).
- **No translation of user-generated content.** Product reviews stay exactly as submitted, in whatever language the reviewer wrote them. This phase does not add a `bodyBn` field to `Review` or attempt to translate review text — that would misrepresent what a real customer said.
- **No URL routing changes.** Still cookie-based (`NEXT_LOCALE`), consistent with Phase 1 — this phase touches *what* gets translated, not *how* the locale is chosen or persisted.
- **No re-architecture of the existing `next-intl` UI-chrome system.** Phase 1's namespaces (`common`, `nav`, `search`, `home`, `product`, `products`, `pdp`) are untouched; this phase adds new namespaces for the five static pages using the identical mechanism, and a parallel, separate mechanism (database columns) for dynamic catalog content.

## Data model changes

`apps/api/prisma/schema.prisma` — nullable Bangla columns added to three existing models (additive migration, zero risk to existing data or existing English content):

```prisma
model Product {
  // ...existing fields unchanged...
  nameBn             String?
  descriptionBn      String?
  shortDescriptionBn String?
}

model Category {
  // ...existing fields unchanged...
  nameBn        String?
  descriptionBn String?
}

model Banner {
  // ...existing fields unchanged...
  headingBn    String?
  subheadingBn String?
}
```

No new tables, no new indexes needed (these columns are never queried/filtered on directly except by the search extension below, which uses the same `ILIKE`/tokenized approach already applied to the English columns).

## API surface

No endpoint signatures change. The existing product/category/banner serialization (Model → Service → Controller layering already in place) simply includes the new nullable fields in its response shape, the same way `compareAtPrice` or `subheading` already ride along today. `apps/web/src/lib/api-client.ts` consumers get the new fields for free once the shared TypeScript types (`packages/shared-types`) are updated to include them.

**Search extension** (`apps/api/src/modules/products/products.service.ts`, `buildSearchFilter`): currently does AND-of-words matching against `name` and `description`. Extended to match a word against *any* of `name`, `description`, `nameBn`, `descriptionBn` — so a query is satisfied per-word by either language, letting a Bangla-typing customer find products regardless of which language's text actually contains the match.

## Frontend: the `localize()` helper

New helper in `apps/web/src/lib/localize.ts`:

```ts
export function localize(en: string, bn: string | null | undefined, locale: Locale): string {
  return locale === 'bn' && bn ? bn : en;
}
```

Used everywhere product/category/banner text renders: `ProductCard`, the PDP (`apps/web/src/app/(shop)/products/[slug]/page.tsx`), category chips and the homepage `CategoryShowcase` tiles, and `HeroSlider`. Each of these already knows the current locale (via `useLocale()` client-side or `resolveLocale()`/cookie server-side, both already in place from Phase 1) — this is a pure display-layer decision, not a new state source.

Behavior: if `bn` is null/empty (not yet translated) or the locale is `en`, the English string renders — no blank text, no broken layout, ever. This means content can be translated incrementally without any "half-migrated" visual breakage; Phase 2's rollout order (below) doesn't need to be perfectly atomic.

## Static pages

`apps/web/src/app/about/page.tsx`, `contact/page.tsx`, `terms/page.tsx`, `privacy/page.tsx`, `shipping-returns/page.tsx` — these are hardcoded JSX today, not database-driven. They get the exact Phase 1 treatment: `await getTranslations('<page>')`, new namespaces (`about`, `contact`, `terms`, `privacy`, `shippingReturns`) added to `apps/web/src/messages/en.json`/`bn.json` with every paragraph/heading as a key, verbatim-extracted English wording (matching the Global Constraint Phase 1 established) plus a hand-written Bangla counterpart.

## Admin editing

Existing admin edit forms (`/admin/products/[id]/edit`, category management, `/admin/banners`) gain an EN/BN tab control above the translatable fields (name, description, short description / heading, subheading). Selecting a tab shows that language's inputs bound to the corresponding column (`name` vs `nameBn`, etc.). No new admin routes, no new pages — this is a form-level addition to existing screens, following whatever tab/toggle pattern is already idiomatic elsewhere in the admin UI (checked at implementation time against the existing admin component library rather than inventing a new pattern here).

## Content authoring & rollout

The mechanism (schema + helper + search + static-page wiring) is a small, single implementation task. The bulk of the work is writing real Bangla (and, for the ~9 pre-existing robotics products currently Bangla-only, writing the *missing* English) for:

- 5 static pages (~500 lines of existing English legal/informational text)
- 14 categories (name + description)
- 4 banners (heading + subheading)
- 40 products (name + description + short description each)

Given the volume, implementation proceeds the same way Phase 1 did — subagent-driven development, one task for the mechanism (migration, `localize()`, search extension, admin tab UI) and separate tasks per content batch (static pages; categories + banners; products, likely split into 2-3 batches so each task stays reviewable), each with real live-browser verification in both locales before being marked complete, exactly the standard this session already established and enforced for Phase 1.

## Testing / verification

Same bar as Phase 1, per task:
- `pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web build` clean
- `pnpm --filter @drikon/api typecheck && pnpm --filter @drikon/api test` clean (no regressions to the existing 104 API tests)
- Real Playwright verification against a live dev server in both `en` and `bn` locales for every content area touched, including: a product with a Bangla translation renders it, a product *without* one falls back to English cleanly, and a Bangla search query (e.g. searching a Bangla product name) returns the right result.
- Final end-to-end pass across the whole site in both languages before merge, mirroring Phase 1's Task 9.
