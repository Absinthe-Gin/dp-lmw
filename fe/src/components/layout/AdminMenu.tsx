"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSessionToken, clearSessionToken } from "@/lib/session";
import PublicAccessToggle from "@/components/settings/PublicAccessToggle";

/**
 * Single dropdown replacing the old separate "Thùng rác" link + admin
 * status pill — everything admin-related (trash, /system, /access,
 * login/logout, and the system-wide public/private toggle) lives behind
 * one "Quản trị" button now, leaving room to add more admin-only actions
 * here later without cluttering the top bar itself.
 */
export default function AdminMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(Boolean(getSessionToken()));
  }, [pathname]);

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  function handleLogout() {
    clearSessionToken();
    setIsAdmin(false);
    setOpen(false);
    if (pathname === "/trash") router.push("/");
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 whitespace-nowrap rounded-full border border-border px-2.5 py-1.5 text-xs text-ink-muted hover:border-accent sm:px-3"
        title="Quản trị"
      >
        <span className={`h-1.5 w-1.5 rounded-full ${isAdmin ? "bg-success" : "bg-ink-faint"}`} />
        <span className="hidden sm:inline">Quản trị</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-border bg-surface p-2 shadow-lg">
          {!isAdmin ? (
            <Link
              href="/admin-login"
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 text-sm font-semibold text-ink hover:bg-surface2"
            >
              Đăng nhập quản trị
            </Link>
          ) : (
            <>
              <Link
                href="/trash"
                onClick={() => setOpen(false)}
                className={`block rounded-md px-3 py-2 text-sm font-semibold hover:bg-surface2 ${
                  pathname === "/trash" ? "text-accent" : "text-ink"
                }`}
              >
                Thùng rác
              </Link>
              <Link
                href="/system"
                onClick={() => setOpen(false)}
                className={`block rounded-md px-3 py-2 text-sm font-semibold hover:bg-surface2 ${
                  pathname === "/system" ? "text-accent" : "text-ink"
                }`}
              >
                Quản lý hệ thống
              </Link>
              <Link
                href="/access"
                onClick={() => setOpen(false)}
                className={`block rounded-md px-3 py-2 text-sm font-semibold hover:bg-surface2 ${
                  pathname === "/access" ? "text-accent" : "text-ink"
                }`}
              >
                Quản lý truy cập
              </Link>
              <Link
                href="/slides"
                onClick={() => setOpen(false)}
                className={`block rounded-md px-3 py-2 text-sm font-semibold hover:bg-surface2 ${
                  pathname === "/slides" ? "text-accent" : "text-ink"
                }`}
              >
                Quản lý slide
              </Link>

              <div className="my-2 border-t border-border" />

              <div className="px-3 py-2">
                <PublicAccessToggle />
              </div>

              <div className="my-2 border-t border-border" />

              <button
                type="button"
                onClick={handleLogout}
                className="block w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-danger hover:bg-surface2"
              >
                Đăng xuất quản trị
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
