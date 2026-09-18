"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/hooks/hooks";
import { clearNotifications, closePanel, setRole, togglePanel } from "@/redux/slices/navSlice";
import { authClient } from "@/lib/auth-client";

// Placeholder feed — swap for real concept-gap / attempt data once the
// attempts + concept-performance tables are wired up.
const NOTIFICATIONS = [
  {
    id: "n1",
    title: "Critical gap detected",
    detail: "Virtual Memory dropped to 30% after the OS midterm.",
  },
  {
    id: "n2",
    title: "Remediation complete",
    detail: "Rahul raised Paging from 58% to 82% after targeted practice.",
  },
  {
    id: "n3",
    title: "New assessment submitted",
    detail: '24 of 28 students finished "Process Scheduling Quiz."',
  },
];

export default function NavActions() {
  const dispatch = useAppDispatch();
  const role = useAppSelector((s) => s.nav.role);
  const openPanel = useAppSelector((s) => s.nav.openPanel);
  const unread = useAppSelector((s) => s.nav.unreadNotifications);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { data: session, isPending } = authClient.useSession();

  async function handleSignOut() {
    setIsSigningOut(true);
    const result = await authClient.signOut();

    if (!result.error) {
      dispatch(closePanel());
      router.replace("/login");
      return;
    }

    setIsSigningOut(false);
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        dispatch(closePanel());
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dispatch(closePanel());
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [dispatch]);

  if (isPending) {
    return <div className="h-10 w-40 animate-pulse rounded-full bg-ink-900" aria-hidden="true" />;
  }

  if (!session) {
    return (
      <Link
        href={`/login?callbackUrl=${encodeURIComponent(pathname || "/dashboard")}`}
        className="rounded-full bg-gradient-to-r from-brand-600 to-bloom-600 px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_var(--color-brand-600)] transition-transform motion-safe:hover:scale-[1.03] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
      >
        Log in
      </Link>
    );
  }

  const accountName = session.user.name?.trim() || session.user.email;
  const initials = getInitials(accountName);

  return (
    <div ref={rootRef} className="flex items-center gap-3">
      {/* Teacher / Student — swap for the session's real role once auth lands */}
      <div
        className="flex items-center rounded-full bg-ink-900 p-1 text-xs font-medium"
        role="group"
        aria-label="View as"
      >
        {(["teacher", "student"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => dispatch(setRole(r))}
            aria-pressed={role === r}
            className={`rounded-full px-3 py-1.5 capitalize transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70 ${
              role === r
                ? "bg-gradient-to-r from-brand-600 to-bloom-600 text-white shadow-sm"
                : "text-mist-400 hover:text-mist-200"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <a
        href={role === "teacher" ? "/classes" : "/practice"}
        className="rounded-full bg-gradient-to-r from-brand-600 to-bloom-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_var(--color-brand-600)] transition-transform motion-safe:hover:scale-[1.03] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
      >
        {role === "teacher" ? "Classes" : "Practice weak spots"}
      </a>

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            dispatch(togglePanel("notifications"));
            if (unread > 0) dispatch(clearNotifications());
          }}
          aria-label="Notifications"
          aria-expanded={openPanel === "notifications"}
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-mist-300 transition-colors hover:bg-ink-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70"
        >
          <BellIcon />
          {unread > 0 && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-bloom-600 ring-2 ring-ink-950" />
          )}
        </button>
        {openPanel === "notifications" && (
          <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-ink-800 bg-ink-900/95 p-2 shadow-2xl backdrop-blur-md">
            <p className="px-3 py-2 text-xs font-medium text-mist-400">Recent activity</p>
            <ul className="flex flex-col gap-1">
              {NOTIFICATIONS.map((n) => (
                <li key={n.id} className="rounded-xl px-3 py-2 hover:bg-ink-800">
                  <p className="text-sm font-medium text-white">{n.title}</p>
                  <p className="mt-0.5 text-xs text-mist-400">{n.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => dispatch(togglePanel("profile"))}
          aria-label="Account menu"
          aria-expanded={openPanel === "profile"}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-bloom-600 text-sm font-semibold text-white ring-2 ring-ink-950 transition-transform motion-safe:hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          {initials}
        </button>
        {openPanel === "profile" && (
          <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-ink-800 bg-ink-900/95 p-2 shadow-2xl backdrop-blur-md">
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-white">{accountName}</p>
              <p className="text-xs capitalize text-mist-400">{role} account</p>
            </div>
            <div className="my-1 h-px bg-ink-800" />
            <a href="/settings/profile" className="block rounded-xl px-3 py-2 text-sm text-mist-300 hover:bg-ink-800 hover:text-white">
              Your profile
            </a>
            <a href="/settings" className="block rounded-xl px-3 py-2 text-sm text-mist-300 hover:bg-ink-800 hover:text-white">
              Settings
            </a>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="block w-full rounded-xl px-3 py-2 text-left text-sm text-mist-300 hover:bg-ink-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSigningOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function getInitials(value: string) {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "?";
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M6 8a6 6 0 1 1 12 0c0 2.5 1 4.2 1.8 5.2.5.6.1 1.5-.7 1.5H4.9c-.8 0-1.2-.9-.7-1.5C5 12.2 6 10.5 6 8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9.5 18a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}