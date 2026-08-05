---
description: Resume DP LMW work fast — live deploy status, what's pending, and quick health checks, without re-deriving history or re-reading the whole conversation.
---

# Resume: DP LMW

Read this first, then `CLAUDE.md` only for architecture/convention details you actually need — don't re-explore the codebase to rediscover things already answered here.

## Live right now

- Frontend: https://dp-lmw-fe.vercel.app (Vercel, Root Directory=`fe`)
- Backend: https://dp-lmw-be.onrender.com (Render free web service, Blueprint via `render.yaml`)
- DB + Storage: Supabase (project `tokosunpcsrcgqjjdwwz`, region `ap-southeast-1`) — Postgres + S3-compatible Storage bucket `DPLMW`
- Repo: https://github.com/Absinthe-Gin/dp-lmw, branch `main`, both hosts auto-deploy on push
- Local dev creds live in `be/.env` / `fe/.env` (gitignored, not in this repo) — if missing, ask the user; don't try to reconstruct secrets

Quick liveness check (run before assuming something's broken — Render free tier sleeps after 15min idle, first hit takes ~30-50s):
```
curl -s https://dp-lmw-be.onrender.com/health
curl -s https://dp-lmw-fe.vercel.app/ -o /dev/null -w "%{http_code}\n"
```

## What's done

Full build: fe (Next.js UI only) / be (Express+Prisma API) / ai (pure grouping+media logic, no DB) / packages/shared (DTO contract) monorepo. Public read/write, admin-password-gated delete only. Blue/white "DP LMW" brand, responsive down to mobile. Manual + auto (date-cluster) album grouping, real photo upload tested end-to-end in production (Vercel → Render → Supabase Storage/Postgres, verified via direct DB query, not just "no error shown").

## Known gaps / pending (in rough priority order)

1. **No custom domain** — still on `*.vercel.app` / `*.onrender.com`. Original ask mentioned "tên miền riêng"; buying a domain + DNS + attaching in Vercel/Render dashboards is still open.
2. **No manual "create album" UI** — `POST /api/albums` exists and works, but `fe/src/app/albums/page.tsx` only has the "Gộp tự động" button, no "+ Album mới" form (the design mockup showed one; it was never wired up).
3. **"Tạo video từ album" is a stub** — `ai/src/video.ts`'s `generateAlbumSlideshow` returns `null`, `POST /api/albums/:id/video` responds 501. Real ffmpeg-based implementation not started.
4. **No test suite** anywhere in the repo.
5. **`npm audit` reports high-severity advisories** in Next.js 14.x and libvips (via sharp) — fixing means a Next.js major bump (14→16), not done yet since it's a breaking-change-risk decision, not a quick patch.
6. **Render free tier cold starts** (~30-50s after 15min idle) — acceptable for a personal/demo vault, would need a paid tier to remove.

## Gotchas already paid for — don't re-break these

- `ai/package.json` and `packages/shared/package.json` **must** point `main`/`types` at `dist/...`, never at `src/*.ts` — breaks `node dist/server.js` in production (see CLAUDE.md "Deploy target" section for the full story).
- `be`'s build **must** run `prisma generate` before `tsc` — `npm install` alone doesn't guarantee it in this workspace layout. Already wired into `render.yaml` and the root `package.json` build script.
- `fe/package.json`'s own `build` script builds `packages/shared` first (`--prefix ../packages/shared`) — needed because `next build`'s type-check needs `packages/shared/dist/index.d.ts` to exist, and a platform's default Next.js build command won't build it for you.
- Any new `groupByDate`/`groupByLocation` caller needs the `takenAt ?? uploadedAt` fallback (see CLAUDE.md) or EXIF-less uploads silently never group.
- Delete buttons must stay visible without `:hover` on mobile (`opacity-80 md:opacity-0 md:group-hover:opacity-100` pattern) — don't revert to hover-only.
- Every async route handler in `be/src/routes/` must be wrapped in `asyncHandler` (`be/src/lib/asyncHandler.ts`) — Express 4 doesn't catch rejected promises from async handlers, so an unwrapped one crashes the *entire* process on any DB/network hiccup (hit for real via a transient Supabase blip locally). New route = wrap it, unless it's fully sync with no DB call like `auth.ts`.

## If picking up a specific pending item

State which one to the user if ambiguous, then go straight to it — no need to re-verify the whole deploy is healthy first unless something in this doc looks stale (check git log / Render+Vercel dashboards for anything post-dating this file).
