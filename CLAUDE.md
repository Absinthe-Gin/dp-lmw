# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

DP LMW (internal package name still `memory-vault`): a photo/video storage system with manual and automatic album grouping (by capture date / GPS proximity). npm workspaces monorepo with a hard separation between frontend, backend, and AI/grouping logic.

## Commands

```
npm install                                    # installs all workspaces
npm run build -w ai -w packages/shared          # build internal packages (do this before running be/)
npm run -w be prisma:generate                   # regenerate Prisma client after schema.prisma changes
npm run -w be prisma:migrate                    # create/apply a migration (interactive — see Database section if it refuses)
npm run -w be prisma:seed                       # populate 4 sample photos across 2 date clusters (skips if seed data already present)
npm run -w be prisma:studio                     # inspect the DB
npm run dev:be                                  # backend on :4000 (tsx watch)
npm run dev:fe                                  # frontend on :3000 (next dev)
npm run build                                   # builds ai -> shared -> be -> fe in that order (dependency order matters)
```

No test suite exists yet. There is no root lint/typecheck script — `ai` and `packages/shared` each expose `typecheck`/`build` via `tsc`; `fe` has `npm run -w fe lint` (eslint-config-next).

Env files: copy `be/.env.example` -> `be/.env` and `fe/.env.example` -> `fe/.env` (both already exist locally with working dev values — don't overwrite blindly). `be` needs `DATABASE_URL`, `STORAGE_*` (S3-compatible), `ADMIN_PASSWORD`, `JWT_SECRET`, `FRONTEND_ORIGIN`. `fe` needs only `NEXT_PUBLIC_API_URL`. `be/src/server.ts` loads `.env` via a top-of-file `import "dotenv/config"` — Prisma reads `DATABASE_URL` itself regardless, which can mask a missing/broken `.env` (DB calls work, but `ADMIN_PASSWORD`/`JWT_SECRET`/`STORAGE_*` silently come back `undefined`, e.g. admin login 401s with no other symptom). If `fe` can't reach `be`, check `fe/.env`'s `NEXT_PUBLIC_API_URL` is set and `fe`'s dev server was restarted after any env change — Next.js only reads `NEXT_PUBLIC_*` vars at server start.

## Database

**Where it physically lives**: **Supabase** (cloud), project ref `tokosunpcsrcgqjjdwwz`, region `ap-southeast-1`. This is the real, shared, always-on database — anyone the app is deployed for reads/writes the same data, not a per-machine copy. `be/.env`'s `DATABASE_URL` is Supabase's session-mode pooler connection string (`postgresql://postgres.tokosunpcsrcgqjjdwwz:...@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`) — session mode (port 5432 on the pooler host), not the transaction-mode pooler, because `be/` is a persistent Node process and Prisma needs prepared-statement support that transaction mode doesn't give. A local PostgreSQL 16 Windows service was used earlier in development (data dir `C:\Program Files\PostgreSQL\16\data`, db name `memoryvault`) — that data was intentionally discarded, not migrated, when moving to Supabase, so don't go looking for it as a source of truth.

**Schema** (`be/prisma/schema.prisma`): `Media`, `Album`, `AlbumMedia` (join table), two enums (`MediaType`, `AlbumSource`). No `User` table — see Auth model below. Constraints worth knowing when changing this file:
- `Media.storageKey` is `@unique` — it's the object-storage key, so a duplicate would mean two rows silently pointing at the same file.
- Indexes exist specifically for the query patterns in `be/src/routes/`: `Media(uploadedAt)` and `Album(createdAt)` back the two list endpoints' `orderBy`, `Media(takenAt)` backs `groupByDate`'s sort, `AlbumMedia(mediaId)` backs the `albums: { none: {} }` "ungrouped media" filter in `/auto-generate`. If you add a new sort/filter to a list route, check whether it needs a matching index rather than assuming one exists.
- Migrations are committed under `be/prisma/migrations/` (tracked in git, not gitignored) — `20260804161130_init` (initial schema) then `20260804170000_add_indexes_and_constraints`, both applied to Supabase via `prisma migrate deploy`. `prisma migrate dev` is interactive and will refuse to run in a non-interactive shell/agent session when it needs to show a data-loss warning (e.g. adding a `@unique` constraint) — in that situation generate the SQL by hand instead (`prisma migrate diff --from-migrations ./prisma/migrations --to-schema-datamodel ./prisma/schema.prisma --shadow-database-url <a scratch db> --script`), write it into a new timestamped folder under `migrations/`, then apply with `prisma migrate deploy` (non-interactive-safe, just applies pending migration folders).
- `be/prisma/seed.ts` (run via `npm run -w be prisma:seed`, wired through Prisma's `"prisma": {"seed": ...}` field in `be/package.json`) generates 4 real JPEGs and pushes them through `be/src/lib/storage.ts`'s `uploadObject` (so they land wherever `STORAGE_DRIVER` currently points — Supabase Storage or local disk), inserting matching `Media` rows across two `takenAt` clusters. Idempotent — skips if a `media/seed-*` row already exists.

**Backup**: Supabase takes its own automated backups (see the project's Database → Backups dashboard tab) — that's the primary story now, not manual `pg_dump`. For an ad-hoc manual dump against the cloud DB: `pg_dump` needs its options before the connection target:
```
"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" "postgresql://postgres.tokosunpcsrcgqjjdwwz:<password>@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres" -Fc -f backup.dump
```
A DB-only backup is incomplete when `STORAGE_DRIVER=local`: `Media.storageKey` rows would point at files in `be/uploads/` that a DB dump doesn't capture. Under the current `STORAGE_DRIVER=s3` (Supabase Storage), the bucket itself is the durable copy of file bytes, so a Postgres backup alone is sufficient for the metadata.

## Auth model — read this before touching routes

This is a **shared public vault, not a multi-user app**. There are no user accounts. Viewing, uploading, and editing (rename album, add/remove items, run auto-generate) are open to anyone with the URL — no token required. The **only** login is a single shared admin password (`ADMIN_PASSWORD`), and it gates **delete only**: `DELETE /api/media/:id` and `DELETE /api/albums/:id`, both behind `be/src/middleware/requireAdmin.ts`. There is no per-resource `ownerId` anywhere in the schema or DTOs — don't reintroduce one without an explicit reason to.

When adding a new route, default to public. Only wrap it in `requireAdmin` if it's destructive (delete/purge), matching the existing two routes.

## Architecture

Four workspaces, each with a distinct responsibility. Reading only one is usually not enough to change a feature end-to-end — a new field on `Media`, for example, touches `be/prisma/schema.prisma`, `packages/shared` (DTO), the `be` route that maps Prisma rows to DTOs, and the `fe` component that renders it.

- **`fe/`** — Next.js App Router, UI only. It holds no server-side data logic: every page that needs data is a **client component** (`"use client"`) that calls `be/` over HTTP via `fe/src/lib/api-client.ts`. There is no Next.js `api/` folder in `fe/` — that's deliberate, all API logic lives in `be/`.
  - Admin login: `fe/src/app/admin-login/page.tsx` is a plain password form that POSTs to `be`'s `/api/auth/admin-login` and stores the returned JWT via `fe/src/lib/session.ts` (localStorage key `mv_admin_token`). `api-client.ts` attaches it as a `Bearer` header on every request, but the backend only checks it on the two delete routes — its presence elsewhere is a no-op.
  - Delete buttons (`MediaCard.tsx`, `AlbumCard.tsx`) check `getSessionToken()` client-side before calling delete; if absent they redirect to `/admin-login?next=<current path>` instead of letting the request 401.
- **`be/`** — Express + Prisma REST API (`be/src/server.ts`). Not deployable as a serverless function (uses `multer` in-memory uploads + `sharp`/exif processing) — needs a long-running Node process.
  - `be/src/routes/{auth,media,albums}.ts` are the HTTP layer: parse request, call Prisma (`be/src/lib/db.ts`) and/or `@memory-vault/ai`, map results to `@memory-vault/shared` DTOs, respond. Routes own all persistence — `ai/` never touches the database.
  - `be/prisma/schema.prisma` — models: `Media` (has `storageKey`/`thumbnailKey` pointing into object storage, plus EXIF-derived `takenAt`/`latitude`/`longitude`), `Album` (`source`: `MANUAL` | `AUTO_DATE` | `AUTO_LOCATION`), and the `AlbumMedia` join table. No `User` model.
- **`ai/`** (`@memory-vault/ai`) — the "smart" logic, intentionally decoupled from Prisma/the database so it stays pure and testable in isolation:
  - `grouping.ts` — `groupByDate`/`groupByLocation`: pure functions over plain `{ id, takenAt, latitude, longitude }` points, no I/O. `be/src/routes/albums.ts` fetches ungrouped `Media` rows, calls these, then persists the resulting groups as `Album` rows itself.
  - `exif.ts` / `thumbnail.ts` — EXIF extraction and thumbnail generation, invoked from `be/src/routes/media.ts` during upload.
  - `tagging.ts` — placeholder for future LLM-based captioning/album-title suggestions; not wired up.
  - `video.ts` — placeholder for turning an album into a slideshow/video (ffmpeg-based). `be`'s `POST /api/albums/:id/video` calls it and returns 501 until it's implemented — that's the "tạo video" feature, deliberately stubbed rather than half-built.
- **`packages/shared`** (`@memory-vault/shared`) — the API contract: `MediaDTO`/`AlbumDTO`/`AlbumDetailDTO` types imported by both `fe` and `be` so their view of a resource can't silently drift apart. Dates cross the wire as ISO strings, not `Date` objects.

### Media display flow
Object storage is private; nothing is served by public URL. List/detail endpoints return DTOs with `thumbnailUrl: null`, and `fe/src/components/media/MediaCard.tsx` separately calls `GET /api/media/:id/url` to fetch a short-lived signed URL per item. Don't try to shortcut this by adding public bucket URLs to the DTO.

### Storage driver: local vs s3
`be/src/lib/storage.ts` supports two drivers selected by `STORAGE_DRIVER`: `"local"` (writes to `be/uploads/`, served unsigned via `app.use("/files", express.static(...))` in `server.ts`, zero cloud setup — useful if working offline or Supabase is unreachable) and `"s3"` (real signed URLs, **this is what's actually configured right now**). `STORAGE_DRIVER=s3` currently points at **Supabase Storage**'s S3-compatible endpoint, not Cloudflare R2 — despite `storage.ts`'s comments mentioning R2 as an example, the live values in `be/.env` are:
```
STORAGE_BUCKET="DPLMW"
STORAGE_REGION="ap-southeast-1"
STORAGE_ENDPOINT="https://tokosunpcsrcgqjjdwwz.supabase.co/storage/v1/s3"
```
The `S3Client` is constructed with `forcePathStyle: true` in `storage.ts` — required for Supabase Storage's endpoint (path-style `endpoint/bucket/key`, not virtual-hosted-style `bucket.endpoint/key`); harmless if this is ever pointed at R2 instead, which supports both styles. **Never ship `local` to production** — it has no real URL expiry and no auth on the static route. The `/files` static route in `server.ts` auto-disables itself whenever `STORAGE_DRIVER=s3`.

### Auto-grouping needs a takenAt fallback
`ai/src/grouping.ts`'s `groupByDate` filters out any media whose `takenAt` is null before sorting — EXIF-less uploads (screenshots, re-saved/re-exported images) would otherwise never join an album. `be/src/routes/albums.ts`'s `/auto-generate` handler works around this by mapping `takenAt: m.takenAt ?? m.uploadedAt` before calling `groupByDate`. If you add another caller of `groupByDate`/`groupByLocation`, apply the same fallback there — it's not baked into the `ai/` functions themselves (they stay pure/unopinionated about fallback policy).

## Design system

Brand: **DP LMW**, blue/white. Tokens live as CSS custom properties in `fe/src/app/globals.css` (`:root` for light, `@media (prefers-color-scheme: dark)` for dark — no manual theme toggle exists yet, so there's no `[data-theme]` override block; add one if a toggle is ever built) and are exposed to Tailwind via `fe/tailwind.config.ts` (`bg`, `surface`, `surface2`, `border`, `ink`, `ink-muted`, `ink-faint`, `accent`/`accent-strong`/`accent-soft`, `danger`, `success`). Use these tokens (`bg-accent`, `text-ink-muted`, etc.) rather than raw Tailwind grays/blues — `neutral-*`/`blue-*` classes from the original scaffold have all been replaced.

Typography: three `next/font/google` faces wired in `fe/src/app/layout.tsx` — **Fraunces** (serif, `font-display`) for the wordmark and page `<h1>`s only, **Public Sans** (`font-sans`, the body default) for everything else, **IBM Plex Mono** (`font-mono`) for counts/dates/tabular data. Don't reach for Inter/Space Grotesk or add another face without updating `layout.tsx`.

Layout: `fe/src/components/layout/TopBar.tsx` renders the "DP" mark + wordmark, the pill-style nav, and the admin-status pill, and is mounted once in `layout.tsx` — page components should not duplicate navigation. A full HTML mockup of all four screens (home, upload, albums, album detail) was used to derive these tokens; it's not part of the repo, just the design reference the current components were built from.

**Mobile/responsive is load-bearing, not an afterthought** — verified at iPhone-width viewport with no horizontal overflow on any page. Two patterns to preserve when touching layout:
- `TopBar.tsx`: the nav pill wraps to its own full-width row below the brand/admin row on narrow screens (`order-3 w-full ... sm:order-none sm:w-auto`), and the admin-status label text is `hidden sm:inline` (only the colored dot shows on mobile, wrapped in a `title` attribute for a11y).
- Delete buttons (`MediaCard.tsx`, `AlbumCard.tsx`): they're `opacity-80` by default and only drop to `opacity-0`/hover-reveal at `md:` and up (`md:opacity-0 md:group-hover:opacity-100`). Don't go back to a plain `opacity-0 group-hover:opacity-100` — touch devices have no hover state, so that would make delete unreachable on mobile.

### Deploy target
`fe/` → Vercel. `be/` → a persistent Node host (Railway/Render/Fly), not Vercel functions. DB → Supabase Postgres (already provisioned, see Database section). Storage → Supabase Storage, S3-compatible (already provisioned; Cloudflare R2 remains a drop-in alternative — same `storage.ts` code path, just different `STORAGE_*` env values — if Supabase Storage's free-tier limits (1GB storage / 5GB bandwidth per month) are outgrown).
