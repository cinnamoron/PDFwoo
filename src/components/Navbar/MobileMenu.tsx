"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/hooks/hooks";
import { closePanel, setRole } from "@/redux/slices/navSlice";
import { authClient } from "@/lib/auth-client";
import type { NavLinkItem } from "./NavLinks";

export default function MobileMenu({ links }: { links: NavLinkItem[] }) {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((s) => s.nav.openPanel === "mobileMenu");
  const role = useAppSelector((s) => s.nav.role);
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();

  function switchRole(nextRole: "teacher" | "student") {
    if (nextRole === role) return;
    const confirmed = window.confirm(`Switch to the ${nextRole} dashboard? The page will refresh.`);
    if (!confirmed) return;
    window.localStorage.setItem("conceptiq-role", nextRole);
    dispatch(setRole(nextRole));
    window.location.href = "/dashboard";
  }

  return (
    <div
      id="mobile-nav-panel"
      className={`overflow-hidden border-t border-ink-800/60 bg-ink-950 transition-[max-height] duration-300 ease-out motion-reduce:transition-none lg:hidden ${
        isOpen ? "max-h-[420px]" : "max-h-0"
      }`}
    >
      <div className="flex flex-col gap-1 px-4 py-4">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => dispatch(closePanel())}
              aria-current={isActive ? "page" : undefined}
              className={`rounded-xl px-3 py-2.5 text-sm font-medium ${
                isActive ? "bg-ink-900 text-white" : "text-mist-300"
              }`}
            >
              {link.label}
            </Link>
          );
        })}

        <div className="my-2 h-px bg-ink-800" />

        {isPending ? (
          <div className="h-10 w-full animate-pulse rounded-xl bg-ink-900" aria-hidden="true" />
        ) : !session ? (
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(pathname || "/dashboard")}`}
            onClick={() => dispatch(closePanel())}
            className="rounded-xl bg-gradient-to-r from-brand-600 to-bloom-600 px-4 py-2.5 text-center text-sm font-semibold text-white"
          >
            Log in
          </Link>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-xl bg-ink-900 p-1 text-xs font-medium">
              {(["teacher", "student"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => switchRole(r)}
                  aria-pressed={role === r}
                  className={`flex-1 rounded-lg px-3 py-2 capitalize ${
                    role === r ? "bg-gradient-to-r from-brand-600 to-bloom-600 text-white" : "text-mist-400"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <a
              href={role === "teacher" ? "/classes" : "/practice"}
              className="mt-2 rounded-xl bg-gradient-to-r from-brand-600 to-bloom-600 px-4 py-2.5 text-center text-sm font-semibold text-white"
            >
              {role === "teacher" ? "Classes" : "Practice weak spots"}
            </a>
          </>
        )}
      </div>
    </div>
  );
}