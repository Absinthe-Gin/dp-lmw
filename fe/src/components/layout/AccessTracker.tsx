"use client";

import { useEffect } from "react";
import { API_URL } from "@/lib/api-client";
import { getVisitorId } from "@/lib/visitorId";

// Comfortably shorter than accessLogs.ts's SESSION_GAP_MS (2 min) so a
// closed/backgrounded tab doesn't get misread as a second, separate visit.
const PING_INTERVAL_MS = 30_000;

/**
 * Mounted once in layout.tsx, deliberately OUTSIDE SiteAccessGate — a visit
 * should be recorded even if the system is private and this browser never
 * gets past the access-code prompt (see requireSiteAccess.ts's allowlist
 * for /ping). Pings immediately on mount, then every 30s for as long as
 * the tab stays open. No UI; feeds be/src/routes/accessLogs.ts, surfaced
 * on the site-admin "Quản lý truy cập" screen (fe/src/app/access/page.tsx).
 */
export default function AccessTracker() {
  useEffect(() => {
    const visitorId = getVisitorId();
    if (!visitorId) return;

    function ping() {
      fetch(`${API_URL}/api/access-logs/ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId }),
        keepalive: true,
      }).catch(() => {
        // Best-effort — a missed ping just means this visit's duration
        // undercounts slightly, not worth surfacing as an error to anyone.
      });
    }

    ping();
    const interval = setInterval(ping, PING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return null;
}
