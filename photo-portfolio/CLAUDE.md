# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> Note on AGENTS.md: the installed Next.js is **15.5.x** (`package.json`: `^15.3.3`), and `node_modules/next/dist/docs/` does not exist in this version. The App Router conventions used here (async `params`, parallel and intercepting routes, `next/font`) are standard Next 15.

## Repo layout

This directory is one of two sibling packages in the `photo-site` git repo, and each has its own `package.json` and `node_modules`:

- `photo-portfolio/` (here): the Next.js 15 / React 19 public site. It reads all content from Sanity.
- `../studio-photo-portfolio/`: the Sanity Studio (v6) that defines the content schema and holds the Lightroom import script.

Both use Sanity project `sd52g8g5`, dataset `production`. A schema change in the Studio (`schemaTypes/*.ts`) usually needs matching changes here in the GROQ projections and hand-written types in `src/sanity/queries.ts`. There is no TypeGen, so those types are kept in sync by hand.

## Commands

Run these from `photo-portfolio/`:

```bash
npm run dev          # next dev on :3000
npm run build        # next build (fetches from Sanity at build time for generateStaticParams)
npm run lint         # ESLint (next core-web-vitals + typescript)
npm run check        # Biome lint + format check
npm run format       # Biome format --write
npx tsc --noEmit     # type-check
```

There is no test suite.

Run these from `../studio-photo-portfolio/`:

```bash
npm run dev                                  # Sanity Studio locally
npm run deploy                               # sanity deploy
npm run import-photos -- --dry-run <file|dir> # preview a Lightroom import
npm run import-photos -- <file|dir>          # create draft photo docs (uses `sanity login` or SANITY_WRITE_TOKEN)
```

Formatting is set by Biome (`biome.json`): single quotes, semicolons, trailing commas, 2-space indent, 100-column lines. The Studio's `package.json` also has a Prettier block (no semicolons), but Biome is what `npm run check` and `npm run format` use.

## Architecture

**Data flow.** All pages are async Server Components that call `client.fetch` (`src/sanity/client.ts`, `useCdn: false`). The root layout sets `export const revalidate = 60` (ISR), so content published in the Studio appears within about a minute without a redeploy. Env vars `NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_DATASET` are optional and fall back to the values above.

**Queries** live in `src/sanity/queries.ts`. Shared GROQ fragments (`IMAGE`, `PHOTO`, `ALL_PHOTOS`, `SETTINGS`) are composed into each query, and the TypeScript types next to them mirror those projections. Each page fetches everything it needs in one query, and the layout fetches separately for the header and footer.

**Photo ordering.** `photoSequence()` returns `siteSettings.featuredPhotos` in their set order (dropping broken refs) if any are set. Otherwise it returns all photos ordered by `coalesce(publishedAt, _createdAt) desc`. `loadPhoto()` in `src/sanity/photos.ts` uses this sequence for the prev/next links and the "n / total" counter. A photo that isn't featured falls back to the all-photos order.

**Lightbox (parallel and intercepting routes).** This is the part that spans the most files:
- `app/photos/[slug]/page.tsx` is the standalone photo page, used for direct links and refreshes.
- `app/@modal/(.)photos/[slug]/page.tsx` intercepts soft navigation from the grid and renders inside `app/@modal/(.)photos/layout.tsx`, which wraps the content in `PhotoLightbox`. That is a native `<dialog>` opened with `showModal()`, and closing it calls `router.back()`. The layout persists between photos so the overlay doesn't flicker.
- `app/@modal/default.tsx`, `page.tsx` and `[...catchAll]/page.tsx` return `null` so the modal slot clears on other navigations.
- The `modal` slot is rendered in `app/layout.tsx`.
- The navigation choices are deliberate. Grid links use `scroll={false}`. Lightbox prev/next use `replace`, so Back closes the lightbox instead of stepping back through photos. The standalone page's prev/next use plain `<a>` and `window.location.assign`, because a client-side navigation to another `/photos/` URL would be intercepted and open the lightbox on top of the page. `PhotoKeyboardNav` has a `mode` prop that encodes these differences for the arrow keys and Esc.
- Clicks on the dialog itself, or on any element with `data-lightbox-backdrop`, close the lightbox.

**Text pages.** `app/[slug]/page.tsx` serves `page` documents (About, Contact, …) with Portable Text. `/contact` still renders without a page document if `siteSettings` has an email or social links. Header and footer nav items for About and Contact appear only when that content exists (logic in `app/layout.tsx`). The Studio reserves the page slugs `photos`, `api` and `studio`.

**Images.** Always use `SanityPicture` (`src/components/SanityPicture.tsx`), which wraps `next/image`. It builds the URL with `@sanity/image-url` (which applies the Studio crop), computes the aspect ratio from the cropped asset dimensions, and uses the asset's LQIP as the blur placeholder. Image queries must project `asset->{ _id, metadata { lqip, dimensions } }` plus `crop` and `hotspot` (the `IMAGE` fragment) for this to work. `next.config.ts` allows only `cdn.sanity.io`.

**Studio specifics.** `siteSettings` is a singleton with the fixed `_id` `"siteSettings"`. It is pinned in the structure, hidden from "Create new", and limited to publish, discard and restore. Queries select it by that id. On `photo`, `format` and `filmStock` only apply when `medium == 'film'`. The import script maps Lightroom keyword hierarchies (`Camera|`, `Film|`, `People|`, `Places|`) onto photo fields and creates `person` docs as needed. It deliberately ignores EXIF Make/Model, which describes the scanner for film scans.

**Styling.** Tailwind v4 is imported in `src/app/globals.css`, but the site mostly uses hand-written semantic classes and CSS custom-property tokens defined in `:root` in that file. Three Google fonts are set up as CSS variables in the layout: `--font-heading` (Archivo, extended), `--font-body` (Courier Prime) and `--font-meta` (IBM Plex Mono). Imports use the `@/` alias for `src/`.

**Legacy scripts.** `scripts/convert-tiffs.js` (`npm run convert:tiffs`) and `scripts/update-portfolio.js` come from an earlier Cloudinary-based pipeline. The site no longer uses Cloudinary (`next-cloudinary` is still listed in dependencies, but nothing imports it), and `generate-manifest.js` is empty. `tiff-originals/` and `tiff-converted/` are gitignored.
