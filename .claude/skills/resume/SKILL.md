---
description: Resume DP LMW work fast — live deploy status, what's pending, and quick health checks, without re-deriving history or re-reading the whole conversation.
---

# Resume: DP LMW

Read this first, then `CLAUDE.md` only for architecture/convention details you actually need — don't re-explore the codebase to rediscover things already answered here.

## Live right now

- Frontend: https://dp-lmw-fe.vercel.app (Vercel, Root Directory=`fe`)
- Backend: https://dp-lmw-be.onrender.com (Render free web service, Blueprint via `render.yaml`)
- DB + Storage: Supabase (project `tokosunpcsrcgqjjdwwz`, region `ap-southeast-1`) — Postgres + S3-compatible Storage bucket `DPLMW`
- Repo: https://github.com/Absinthe-Gin/dp-lmw, branch `main`
- Local dev creds live in `be/.env` / `fe/.env` (gitignored, not in this repo) — if missing, ask the user; don't try to reconstruct secrets

Quick liveness check (run before assuming something's broken — Render free tier sleeps after 15min idle, first hit takes ~30-50s):
```
curl -s https://dp-lmw-be.onrender.com/health
curl -s https://dp-lmw-fe.vercel.app/ -o /dev/null -w "%{http_code}\n"
```

**Vercel auto-deploys reliably. Render does not** — its "Auto-Deploy: On Commit" setting is correctly enabled but the GitHub→Render webhook has silently failed to fire more than once. After any `be/` change, don't trust `/health` (the old instance keeps answering 200 through a stale deploy) — verify with something only the new code would produce, and if stale, go Manual Deploy on the `dp-lmw-be` service in the Render dashboard.

## What's done

Full monorepo: `fe` (Next.js UI only) / `be` (Express+Prisma API) / `ai` (pure grouping+media logic, no DB) / `packages/shared` (DTO contract). Public read/write/edit, admin-password-gated **delete only** (soft-delete to a Trash, with restore + permanent-delete). Blue/white "DP LMW" brand with warm-orange/teal accents, Merriweather+Open Sans type, responsive to mobile, custom on-brand confirm dialogs (no `window.confirm`).

Features working end-to-end in production: manual + auto (date-cluster) album grouping; full album CRUD (create, rename/describe, add/remove media without deleting it, delete); upload with live preview + per-file result banner; a dedicated "Ảnh & Video" library page with Tất cả/Ảnh/Video filter; a detail lightbox (full-res, prev/next, metadata) opening from any media grid; a "recently viewed" section on the home page (client-side/localStorage only, no accounts exist); a Trash for admins to restore or permanently purge media/albums; a shared "Quay lại" back button (`BackButton.tsx`) on every page reachable from more than one place; a client-side title search box on `/albums`.

## Known gaps / pending (in rough priority order)

1. **No custom domain** — still on `*.vercel.app` / `*.onrender.com`. Original ask mentioned "tên miền riêng"; buying a domain + DNS + attaching in Vercel/Render dashboards is still open.
2. **"Tạo video từ album" is a stub** — `ai/src/video.ts`'s `generateAlbumSlideshow` returns `null`, `POST /api/albums/:id/video` responds 501. Real ffmpeg-based implementation not started.
3. **Face detection/recognition was explicitly declined** — user asked for it, then chose "Dừng tính năng này" after being warned it risks crashing the Render free tier (512MB RAM) under model-inference load. Don't build it without the user revisiting that call (e.g. after upgrading Render, or choosing an external hosted API instead of running a model in-process).
4. **No test suite** anywhere in the repo.
5. **`npm audit` reports high-severity advisories** in Next.js 14.x and libvips (via sharp) — fixing means a Next.js major bump (14→16), not done yet since it's a breaking-change-risk decision, not a quick patch.
6. **Render free tier cold starts** (~30-50s after 15min idle) — acceptable for a personal/demo vault, would need a paid tier to remove.

## Gotchas already paid for — don't re-break these

- `ai/package.json` and `packages/shared/package.json` **must** point `main`/`types` at `dist/...`, never at `src/*.ts` — breaks `node dist/server.js` in production.
- `be`'s build **must** run `prisma generate` before `tsc` — `npm install` alone doesn't guarantee it in this workspace layout. Already wired into `render.yaml` and the root `package.json` build script.
- `fe/package.json`'s own `build` script builds `packages/shared` first (`--prefix ../packages/shared`) — `next build`'s type-check needs `packages/shared/dist/index.d.ts` to exist and a platform's default build command won't build it for you.
- Any new `groupByDate`/`groupByLocation` caller needs the `takenAt ?? uploadedAt` fallback or EXIF-less uploads silently never group.
- Delete buttons must stay visible without `:hover` on mobile (`opacity-80 md:opacity-0 md:group-hover:opacity-100` pattern) — don't revert to hover-only.
- Every async route handler in `be/src/routes/` must be wrapped in `asyncHandler` (`be/src/lib/asyncHandler.ts`) — Express 4 doesn't catch rejected promises from async handlers, so an unwrapped one crashes the *entire* process on any DB/network hiccup. New route = wrap it, unless it's fully sync with no DB call like `auth.ts`.
- **Any read query in `be/src/routes/` must filter out soft-deleted rows** (`deletedAt: null`, or for `AlbumMedia`-nested media, `media: { deletedAt: null }`) — this isn't automatic. A real moderation incident happened because an early version of the "list all media" page had nothing to lean on before the Trash system existed.
- New destructive action in `fe/`? Use `useConfirm()` from `ConfirmDialogProvider.tsx`, never `window.confirm()`.
- "Recently viewed" and the admin session token are the only two things intentionally kept in `localStorage` — everything else (albums, media, face/person data if ever built, etc.) belongs in Postgres via `be/`, not the browser.

## If picking up a specific pending item

State which one to the user if ambiguous, then go straight to it — no need to re-verify the whole deploy is healthy first unless something in this doc looks stale (check git log / Render+Vercel dashboards for anything post-dating this file).
