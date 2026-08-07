"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandMark from "./BrandMark";
import ThemeToggle from "@/components/ui/ThemeToggle";
import AdminMenu from "./AdminMenu";

const NAV = [
  { href: "/", label: "Trang chủ" },
  { href: "/upload", label: "Tải lên" },
  { href: "/media", label: "Ảnh & Video" },
  { href: "/albums", label: "Album" },
  { href: "/duplicates", label: "Trùng lặp" },
];

export default function TopBar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:flex-nowrap sm:gap-6 sm:px-6 sm:py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark className="h-9 w-9 flex-none" />
          <span className="font-display text-lg font-semibold">
            LMW <span className="font-medium text-ink-muted">Memories</span>
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
          <ThemeToggle />
          <AdminMenu />
        </div>
      </div>
    </header>
  );
}
