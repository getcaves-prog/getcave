"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
        className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-cave-ash bg-cave-stone md:hidden"
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
        className={`fixed left-0 top-0 z-40 flex h-full w-60 flex-col border-r border-cave-ash bg-cave-dark transition-transform md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-cave-ash px-6 py-5">
          <h1 className="font-[family-name:var(--font-space-mono)] text-sm font-bold tracking-widest text-cave-white uppercase">
            Caves Admin
          </h1>
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`rounded-lg px-3 py-2.5 font-[family-name:var(--font-space-mono)] text-sm transition-colors ${
                isActive(item.href)
                  ? "border-l-2 border-cave-white bg-cave-stone text-cave-white"
                  : "text-cave-fog hover:bg-cave-stone hover:text-cave-light"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-cave-ash px-6 py-4">
          <Link
            href="/"
            className="font-[family-name:var(--font-space-mono)] text-xs text-cave-fog transition-colors hover:text-cave-white"
          >
            Back to app
          </Link>
        </div>
      </aside>
    </>
  );
}
