import "dotenv/config";
import path from "node:path";
import express from "express";
import type { ErrorRequestHandler } from "express";
import cors from "cors";
import { attachmentDisposition } from "./lib/contentDisposition";
import { asyncHandler } from "./lib/asyncHandler";
import { requireSiteAccess } from "./middleware/requireSiteAccess";
import { authRouter } from "./routes/auth";
import { settingsRouter } from "./routes/settings";
import { mediaRouter } from "./routes/media";
import { albumsRouter } from "./routes/albums";
import { duplicatesRouter } from "./routes/duplicates";
import { accessLogsRouter } from "./routes/accessLogs";
import { homeSlidesRouter } from "./routes/homeSlides";

const app = express();

// Render (and most PaaS hosts) put the app behind a reverse proxy, so
// req.socket's address is the proxy's, not the visitor's — this makes
// Express trust X-Forwarded-For and populate req.ip with the real client
// IP instead. Needed for accessLogs.ts's IP logging to record anything
// meaningful in production (in local dev this just yields ::1/127.0.0.1).
app.set("trust proxy", true);

app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000" }));
app.use(express.json());

// Global "is the whole system private right now" gate — a no-op unless an
// admin has switched SystemSettings.isPublic off, in which case everything
// below except its own allowlist (see requireSiteAccess.ts) requires an
// access-code or admin token. Must come before every router.
app.use(asyncHandler(requireSiteAccess));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/media", mediaRouter);
app.use("/api/albums", albumsRouter);
app.use("/api/duplicates", duplicatesRouter);
app.use("/api/access-logs", accessLogsRouter);
app.use("/api/home-slides", homeSlidesRouter);

// Backs the "local" storage driver only (be/src/lib/storage.ts) — dev/no-cloud-creds
// fallback. In production STORAGE_DRIVER=s3 and this route serves nothing.
if (process.env.STORAGE_DRIVER !== "s3") {
  app.use(
    "/files",
    // Mirrors S3's ResponseContentDisposition trick (storage.ts's
    // getSignedDownloadUrl) so a forced-download link behaves the same
    // under either storage driver: ?download=<name> -> Content-Disposition.
    (req, res, next) => {
      if (typeof req.query.download === "string") {
        res.setHeader("Content-Disposition", attachmentDisposition(req.query.download));
      }
      next();
    },
    express.static(path.join(__dirname, "..", "uploads"))
  );
}

// Catch-all error handler. Route handlers are wrapped in asyncHandler
// (be/src/lib/asyncHandler.ts), which forwards rejected promises here via
// next(err) instead of leaving them as unhandled rejections — without
// this, a transient DB/network error (e.g. a Supabase hiccup) would crash
// the whole process instead of just failing that one request.
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Đã có lỗi xảy ra, vui lòng thử lại." });
};
app.use(errorHandler);

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`[be] listening on :${port}`);
});
