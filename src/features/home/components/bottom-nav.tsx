"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { getFlyerCreator } from "@/features/canvas/services/canvas.service";
import { COMMUNITIES_ENABLED } from "@/shared/config/features";
import { cn } from "@/shared/lib/utils/cn";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  /** Extra paths that should mark this item active. */
  match?: (pathname: string) => boolean;
}

const ICON_PROPS = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [profile, setProfile] = useState<{
    username: string;
    avatar_url: string | null;
  } | null>(null);

  useEffect(() => {
    let active = true;
    if (!user) {
      // Defer clearing to a microtask so we don't setState synchronously in
      // the effect body (avoids cascading renders).
      Promise.resolve().then(() => {
        if (active) setProfile(null);
      });
      return () => {
        active = false;
      };
    }
    getFlyerCreator(user.id).then((data) => {
      if (active) setProfile(data);
    });
    return () => {
      active = false;
    };
  }, [user]);

  const profileHref = profile ? `/profile/${profile.username}` : "/profile";

  const items: NavItem[] = [
    {
      label: "Explorar",
      href: "/explorar",
      match: (p) => p.startsWith("/explorar"),
      icon: (
        <svg {...ICON_PROPS}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
    },
    ...(COMMUNITIES_ENABLED
      ? [
          {
            label: "Comunidades",
            href: "/communities",
            match: (p: string) => p.startsWith("/communities"),
            icon: (
              <svg {...ICON_PROPS}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            ),
          } satisfies NavItem,
        ]
      : []),
    {
      label: "Eventos",
      href: "/explorar",
      match: () => false,
      icon: (
        <svg {...ICON_PROPS}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      label: "Guardados",
      href: profileHref,
      match: () => false,
      icon: (
        <svg {...ICON_PROPS}>
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="safe-area-bottom fixed inset-x-0 bottom-0 z-50 border-t border-cave-ash bg-cave-black/90 backdrop-blur-md">
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map((item) => {
          const active = item.match
            ? item.match(pathname)
            : pathname === item.href;
          return (
            <li key={item.label} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 py-2 transition-colors",
                  active ? "text-white" : "text-cave-fog hover:text-cave-light",
                )}
              >
                {item.icon}
                <span className="font-[family-name:var(--font-space-mono)] text-[9px] uppercase tracking-wider">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}

        {/* Profile avatar — last item. */}
        <li className="flex-1">
          <Link
            href={profileHref}
            aria-label="Mi perfil"
            className={cn(
              "flex min-h-[56px] flex-col items-center justify-center gap-1 py-2 transition-colors",
              pathname.startsWith("/profile")
                ? "text-white"
                : "text-cave-fog hover:text-cave-light",
            )}
          >
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt=""
                className={cn(
                  "h-6 w-6 rounded-full object-cover",
                  pathname.startsWith("/profile")
                    ? "ring-2 ring-white"
                    : "ring-1 ring-cave-ash",
                )}
              />
            ) : (
              <svg {...ICON_PROPS} width={20} height={20}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
            <span className="font-[family-name:var(--font-space-mono)] text-[9px] uppercase tracking-wider">
              Perfil
            </span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
