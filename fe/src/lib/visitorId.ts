const VISITOR_ID_KEY = "mv_visitor_id";

/**
 * A random id identifying "this browser" across visits — not an account,
 * just a stable anonymous handle so be/src/routes/accessLogs.ts can group
 * consecutive pings into one "visit" instead of one row per request.
 * Generated once and persisted in localStorage; a cleared browser/private
 * window looks like a brand new visitor, which is fine for this feature's
 * purpose (rough device/visit tracking on the "Quản lý truy cập" screen).
 */
export function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
}
