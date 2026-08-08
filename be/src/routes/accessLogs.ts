import { Router } from "express";
import { db } from "../lib/db";
import { requireAdmin } from "../middleware/requireAdmin";
import { asyncHandler } from "../lib/asyncHandler";
import { lookupLocation } from "../lib/geoLookup";

export const accessLogsRouter = Router();

// A gap longer than this since the last ping means the old row is a
// finished visit (duration frozen at its last lastSeenAt) rather than
// still-ongoing — the next ping from that visitorId starts a new row
// instead of resurrecting the old one. Comfortably longer than the
// frontend's ping interval (see fe/src/components/layout/AccessTracker.tsx)
// so a couple of missed pings don't wrongly split one visit into two.
const SESSION_GAP_MS = 2 * 60 * 1000;

// Public, always reachable (listed in requireSiteAccess.ts's allowlist) —
// this needs to record a visit even while the system is private and the
// visitor hasn't gotten past the access-code gate yet, so it can't be
// gated behind the same thing it's trying to observe.
accessLogsRouter.post(
  "/ping",
  asyncHandler(async (req, res) => {
    const { visitorId } = req.body as { visitorId?: string };
    if (!visitorId) return res.status(400).json({ error: "Missing visitorId" });

    const ipAddress = req.ip ?? "unknown";
    const userAgent = req.headers["user-agent"] ?? null;
    const now = new Date();

    const existing = await db.accessLog.findFirst({
      where: { visitorId },
      orderBy: { lastSeenAt: "desc" },
    });

    if (existing && now.getTime() - existing.lastSeenAt.getTime() <= SESSION_GAP_MS) {
      await db.accessLog.update({ where: { id: existing.id }, data: { lastSeenAt: now } });
    } else {
      // New visit — resolve location once here rather than on every ping.
      const location = await lookupLocation(ipAddress);
      await db.accessLog.create({ data: { visitorId, ipAddress, location, userAgent, startedAt: now, lastSeenAt: now } });
    }

    res.json({ ok: true });
  })
);

// Admin only: the "Quản lý truy cập" screen's data source.
accessLogsRouter.get(
  "/",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const logs = await db.accessLog.findMany({ orderBy: { lastSeenAt: "desc" }, take: 200 });
    const now = Date.now();

    res.json(
      logs.map((l) => {
        const isActive = now - l.lastSeenAt.getTime() <= SESSION_GAP_MS;
        const durationSec = Math.max(0, Math.round((l.lastSeenAt.getTime() - l.startedAt.getTime()) / 1000));
        return {
          id: l.id,
          ipAddress: l.ipAddress,
          location: l.location,
          userAgent: l.userAgent,
          startedAt: l.startedAt.toISOString(),
          lastSeenAt: l.lastSeenAt.toISOString(),
          durationSec,
          isActive,
        };
      })
    );
  })
);

// Admin only: deletes one log row — purely a log-cleanup action, nothing
// else. Doesn't touch the visitor it belonged to in any way: if that
// visitorId is still actively pinging, the very next POST /ping above
// finds no existing row (it was just deleted) and simply starts a fresh
// one, same as any brand-new visit. Never blocks, disconnects, or
// otherwise affects whoever's currently browsing.
accessLogsRouter.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    await db.accessLog.deleteMany({ where: { id: req.params.id } }); // deleteMany so an already-gone id is a no-op, not a 404/500
    res.json({ ok: true });
  })
);
