import "dotenv/config";
import path from "node:path";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { mediaRouter } from "./routes/media";
import { albumsRouter } from "./routes/albums";

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000" }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/media", mediaRouter);
app.use("/api/albums", albumsRouter);

// Backs the "local" storage driver only (be/src/lib/storage.ts) — dev/no-cloud-creds
// fallback. In production STORAGE_DRIVER=s3 and this route serves nothing.
if (process.env.STORAGE_DRIVER !== "s3") {
  app.use("/files", express.static(path.join(__dirname, "..", "uploads")));
}

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`[be] listening on :${port}`);
});
