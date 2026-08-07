"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api-client";
import { getSessionToken } from "@/lib/session";
import { getSiteAccessToken } from "@/lib/siteAccess";
import AccessCodeModal from "./AccessCodeModal";

/**
 * Mounted once in layout.tsx, wrapping TopBar + page content. Blocks
 * rendering entirely behind AccessCodeModal whenever an admin has switched
 * the system to private (AdminMenu.tsx's "Public hệ thống" toggle) and this
 * browser doesn't already hold an admin or site-access token.
 *
 * /admin-login is always exempt — otherwise an admin could never reach the
 * login page to unlock the rest of the app, and the "Site admin" button in
 * the modal would just redirect into another wall.
 */
export default function SiteAccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isPublic, setIsPublic] = useState<boolean | null>(null); // null = still loading
  const [hasLocalToken, setHasLocalToken] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ isPublic: boolean }>("/api/settings/public-status")
      .then(({ isPublic }) => {
        if (!cancelled) setIsPublic(isPublic);
      })
      // Fail-open on a network hiccup — the backend gate still protects
      // actual data either way, this only controls the UI-level prompt.
      .catch(() => !cancelled && setIsPublic(true));
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
  if (isPublic === null) return null;
  if (isPublic || hasLocalToken) return <>{children}</>;

  return <AccessCodeModal onUnlock={() => setHasLocalToken(true)} />;
}
