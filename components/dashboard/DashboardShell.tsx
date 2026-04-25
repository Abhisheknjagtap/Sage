"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase";
import { ThemeToggle } from "./ThemeToggle";

function IconHome() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.25 8.625L9 2.25l6.75 6.375V15.75a.75.75 0 01-.75.75H3a.75.75 0 01-.75-.75V8.625z" />
      <path d="M6.75 16.5V11.25h4.5V16.5" />
    </svg>
  );
}

function IconConversations() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15.75 10.5a1.5 1.5 0 01-1.5 1.5H4.5L1.5 15V3a1.5 1.5 0 011.5-1.5h12a1.5 1.5 0 011.5 1.5v7.5z" />
    </svg>
  );
}

function IconInsights() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="2.25,13.5 6.75,9 9.75,12 15.75,5.25" />
      <path d="M12.75 5.25h3v3" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="9" r="2.25" />
      <path d="M9 1.5v1.5M9 15v1.5M1.5 9H3M15 9h1.5M3.697 3.697l1.06 1.06M13.243 13.243l1.06 1.06M14.303 3.697l-1.06 1.06M4.757 13.243l-1.06 1.06" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5.5 13H2.5a1 1 0 01-1-1V3a1 1 0 011-1h3M9.5 10.5L13 7.5 9.5 4.5M13 7.5H5.5" />
    </svg>
  );
}

const NAV_ITEMS = [
  { label: "Home", href: "/dashboard", Icon: IconHome },
  { label: "Conversations", href: "/conversations", Icon: IconConversations },
  { label: "Insights", href: "/patterns", Icon: IconInsights },
  { label: "Settings", href: "/profile", Icon: IconSettings },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useUser();
  const supabase = createClient();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Chat pages are immersive — no nav chrome
  const isChat = pathname.startsWith("/chat");

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--color-background-warm)" }}
    >
      {/* Desktop sidebar */}
      <aside
        className={`${isChat ? "hidden" : "hidden md:flex"} fixed left-0 top-0 h-screen w-56 flex-col z-20`}
        style={{
          background: "var(--color-surface)",
          borderRight: "1px solid rgba(140,134,128,0.15)",
        }}
      >
        {/* Wordmark + theme toggle */}
        <div className="flex items-center justify-between px-6 pt-7 pb-8">
          <span
            className="text-base tracking-tight"
            style={{ color: "var(--color-text-primary)", fontWeight: 500 }}
          >
            companion
          </span>
          <ThemeToggle />
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV_ITEMS.map(({ label, href, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
                style={{
                  color: active
                    ? "var(--color-accent)"
                    : "var(--color-text-muted)",
                  background: active
                    ? "rgba(201,145,90,0.08)"
                    : "transparent",
                  fontWeight: active ? 500 : 400,
                }}
              >
                <Icon />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-3">
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
            style={{ background: "rgba(140,134,128,0.06)" }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
              style={{ background: "var(--color-accent)" }}
            >
              {profile?.display_name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <span
              className="flex-1 text-sm truncate"
              style={{ color: "var(--color-text-primary)" }}
            >
              {profile?.display_name ?? "You"}
            </span>
            <button
              onClick={handleLogout}
              className="opacity-40 hover:opacity-80 transition-opacity"
              style={{ color: "var(--color-text-muted)" }}
              title="Sign out"
            >
              <IconLogout />
            </button>
          </div>
        </div>
      </aside>

      {/* Page content */}
      <main className={`${isChat ? "" : "md:ml-56"} min-h-screen ${isChat ? "" : "pb-24 md:pb-10"}`}>
        {children}
      </main>

      {/* Mobile bottom nav — hidden on chat pages */}
      <nav
        className={`${isChat ? "hidden" : "md:hidden"} fixed bottom-0 left-0 right-0 flex border-t z-20`}
        style={{
          background: "var(--color-surface)",
          borderColor: "rgba(140,134,128,0.15)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {NAV_ITEMS.map(({ label, href, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors"
              style={{
                color: active
                  ? "var(--color-accent)"
                  : "var(--color-text-muted)",
              }}
            >
              <Icon />
              <span className="text-xs">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
