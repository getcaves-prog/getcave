"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/features/auth/services/auth.service";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/flyers", label: "Flyers" },
  { href: "/admin/users", label: "Users" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl border border-cave-ash bg-cave-stone md:hidden"
        aria-label="Toggle menu"
      >
        <span className="flex flex-col gap-1">
          <span
            className={`block h-0.5 w-5 bg-cave-white transition-transform ${open ? "translate-y-1.5 rotate-45" : ""}`}
          />
          <span
            className={`block h-0.5 w-5 bg-cave-white transition-opacity ${open ? "opacity-0" : ""}`}
          />
          <span
            className={`block h-0.5 w-5 bg-cave-white transition-transform ${open ? "-translate-y-1.5 -rotate-45" : ""}`}
          />
        </span>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-dvh w-60 flex-col border-r border-cave-ash bg-cave-dark transition-transform md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-cave-ash px-6 py-5">
          <h1 className="font-[family-name:var(--font-space-mono)] text-sm font-bold tracking-widest text-cave-white uppercase">
            Caves Admin
          </h1>
          {/* Mobile close button */}
          <button
            onClick={() => setOpen(false)}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-cave-fog transition-colors hover:text-cave-white md:hidden"
            aria-label="Close menu"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex min-h-[44px] items-center rounded-lg px-3 font-[family-name:var(--font-space-mono)] text-sm transition-colors ${
                isActive(item.href)
                  ? "border-l-2 border-cave-white bg-cave-stone text-cave-white"
                  : "text-cave-fog hover:bg-cave-stone hover:text-cave-light"
              }`}
            >
              {item.label}
            </Link>
          ))}

          <button
            onClick={() => signOut()}
            className="mt-auto flex min-h-[44px] items-center gap-2 rounded-lg px-3 font-[family-name:var(--font-space-mono)] text-sm text-cave-fog transition-colors hover:bg-cave-stone hover:text-cave-light"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </nav>

        <div className="border-t border-cave-ash px-6 py-4">
          <Link
            href="/"
            className="flex min-h-[44px] items-center font-[family-name:var(--font-space-mono)] text-xs text-cave-fog transition-colors hover:text-cave-white"
          >
            Back to app
          </Link>
        </div>
      </aside>
    </>
  );
}
