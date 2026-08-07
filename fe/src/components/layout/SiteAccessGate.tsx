"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api-client";
import { getSessionToken } from "@/lib/session";
import { getSiteAccessToken } from "@/lib/siteAccess";
import AccessCodeModal from "./AccessCodeModal";

/**
 * Mounted once in layout.tsx, wrapping TopBar + page content. Blocks
 * rendering behind AccessCodeModal whenever an admin has switched the
 * system to private (AdminMenu.tsx's "Public hệ thống" toggle) and this
 * browser doesn't already hold an admin or site-access token.
 *
 * Renders optimistically (assumes public) while the status check is in
 * flight, rather than blocking on it — the common case is public, and
 * be/ runs on Render's free tier where a cold start can take 30-50s;
 * blocking the entire app behind that request turned every cold load into
 * a blank white screen. The rare private-mode case briefly shows real
 * content before the modal slams down once the check resolves, which is a
 * far better trade-off than stalling every single page load. The backend's
 * own requireSiteAccess gate is what actually protects data either way —
 * this component only controls the UI-level prompt.
 *
 * /admin-login is always exempt — otherwise an admin could never reach the
 * login page to unlock the rest of the app, and the "Site admin" button in
 * the modal would just redirect into another wall.
 */
export default function SiteAccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isPublic, setIsPublic] = useState(true); // optimistic default — see note above
  const [hasLocalToken, setHasLocalToken] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ isPublic: boolean }>("/api/settings/public-status")
      .then(({ isPublic }) => {
        if (!cancelled) setIsPublic(isPublic);
      })
      // Fail-open on a network hiccup — already the assumed default, kept
      // explicit so a slow/failed request never flips this to locked.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-checked on every navigation (not just once) so that logging in as
  // admin via the modal's "Site admin" button — which redirects away from
  // /admin-login after success — immediately unlocks the page it lands on.
  useEffect(() => {
    setHasLocalToken(Boolean(getSessionToken() || getSiteAccessToken()));
  }, [pathname]);

  if (pathname === "/admin-login") return <>{children}</>;
  if (isPublic || hasLocalToken) return <>{children}</>;

  return <AccessCodeModal onUnlock={() => setHasLocalToken(true)} />;
}
