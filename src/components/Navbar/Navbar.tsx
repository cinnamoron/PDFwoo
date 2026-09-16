"use client";

import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/hooks/hooks";
import { togglePanel } from "@/redux/slices/navSlice";
import NavLinks, { type NavLinkItem } from "./NavLinks";
import NavActions from "./NavActions";
import MobileMenu from "./MobileMenu";

export default function Navbar() {
  const dispatch = useAppDispatch();
  const role = useAppSelector((s) => s.nav.role);
  const isMobileOpen = useAppSelector((s) => s.nav.openPanel === "mobileMenu");

  const links: NavLinkItem[] =
    role === "teacher"
      ? [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/materials", label: "Materials" },
          { href: "/assessments", label: "Assessments" },
          { href: "/analytics", label: "Analytics" },
        ]
      : [
          { href: "/dashboard", label: "Dashboard" },
          { href: "/assessments", label: "Assessments" },
          { href: "/progress", label: "My progress" },
        ];

  return (
    <header className="sticky top-0 z-50 bg-ink-950/90 backdrop-blur-md">
      <nav className="relative mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
            href="/"
          className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70"
        >
          <ConceptMark />
          <span className="text-lg font-semibold tracking-tight text-white">
            Concept
            <span className="bg-gradient-to-r from-brand-500 to-bloom-500 bg-clip-text text-transparent">
              IQ
            </span>
          </span>
        </Link>

        <NavLinks links={links} className="hidden lg:flex" />

        <div className="flex items-center gap-2">
          <div className="hidden lg:block">
            <NavActions />
          </div>
          <button
            type="button"
            onClick={() => dispatch(togglePanel("mobileMenu"))}
            aria-label={isMobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileOpen}
            aria-controls="mobile-nav-panel"
            className="flex h-10 w-10 items-center justify-center rounded-full text-mist-300 hover:bg-ink-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70 lg:hidden"
          >
            <MenuIcon open={isMobileOpen} />
          </button>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-600/70 to-bloom-600/50"
        />
      </nav>

      <MobileMenu links={links} />
    </header>
  );
}

function ConceptMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id="conceptGrad" x1="4" y1="26" x2="28" y2="6" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--color-bloom-500)" />
          <stop offset="100%" stopColor="var(--color-brand-500)" />
        </linearGradient>
      </defs>
      <path d="M9 22 16 9 23 22" stroke="url(#conceptGrad)" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 9V22" stroke="url(#conceptGrad)" strokeWidth="1.7" strokeOpacity="0.45" />
      <circle cx="16" cy="9" r="3.2" fill="url(#conceptGrad)" />
      <circle cx="9" cy="22" r="3.2" fill="var(--color-ink-950)" stroke="url(#conceptGrad)" strokeWidth="1.7" />
      <circle cx="23" cy="22" r="3.2" fill="var(--color-ink-950)" stroke="url(#conceptGrad)" strokeWidth="1.7" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d={open ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}