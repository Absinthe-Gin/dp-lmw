"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSessionToken, clearSessionToken } from "@/lib/session";

const NAV = [
  { href: "/", label: "Trang chủ" },
  { href: "/upload", label: "Tải lên" },
  { href: "/media", label: "Ảnh & Video" },
  { href: "/albums", label: "Album" },
];

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(Boolean(getSessionToken()));
  }, [pathname]);

  function handleAdminPillClick() {
    if (!isAdmin) {
      router.push("/admin-login");
      return;
    }
    clearSessionToken();
    setIsAdmin(false);
    if (pathname === "/trash") router.push("/");
  }

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:flex-nowrap sm:gap-6 sm:px-6 sm:py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-strong font-display text-[15px] font-semibold text-white">
            DP
          </span>
          <span className="font-display text-lg font-semibold">
            LMW <span className="font-medium text-ink-muted">Vault</span>
          </span>
        </Link>

        <nav className="order-3 flex w-full gap-1 overflow-x-auto rounded-full border border-border bg-surface2 p-1 sm:order-none sm:w-auto sm:overflow-visible">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors sm:px-4 ${
                  active ? "bg-accent text-white" : "text-ink-muted hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              href="/trash"
              className={`whitespace-nowrap rounded-full border border-border px-3 py-1.5 text-xs font-semibold sm:px-3.5 ${
                pathname === "/trash" ? "border-accent text-accent" : "text-ink-muted hover:text-ink"
              }`}
            >
              Thùng rác
            </Link>
          )}
          <button
            type="button"
            onClick={handleAdminPillClick}
            className="flex items-center gap-2 whitespace-nowrap rounded-full border border-border px-2.5 py-1.5 text-xs text-ink-muted hover:border-accent sm:px-3"
            title={isAdmin ? "Bấm để đăng xuất" : "Chưa đăng nhập quản trị"}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isAdmin ? "bg-success" : "bg-ink-faint"}`} />
            <span className="hidden sm:inline">{isAdmin ? "Đã đăng nhập quản trị · Đăng xuất" : "Chưa đăng nhập quản trị"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
