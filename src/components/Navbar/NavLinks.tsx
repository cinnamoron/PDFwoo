"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";

export interface NavLinkItem {
  href: string;
  label: string;
}

export default function NavLinks({
  links,
  className = "",
}: {
  links: NavLinkItem[];
  className?: string;
}) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  const activeHref =
    links.find((l) => pathname === l.href || pathname?.startsWith(`${l.href}/`))?.href ??
    links[0]?.href;

  useLayoutEffect(() => {
    const measure = () => {
      const el = activeHref ? linkRefs.current.get(activeHref) : undefined;
      const container = containerRef.current;
      if (!el || !container) return;
      const containerBox = container.getBoundingClientRect();
      const elBox = el.getBoundingClientRect();
      setIndicator({ left: elBox.left - containerBox.left, width: elBox.width });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeHref, links]);

  return (
    <div ref={containerRef} className={`relative flex items-center gap-1 ${className}`} aria-label="Primary">
      {links.map((link) => {
        const isActive = link.href === activeHref;
        return (
          <Link
            key={link.href}
            href={link.href}
            ref={(node) => {
              if (node) linkRefs.current.set(link.href, node);
              else linkRefs.current.delete(link.href);
            }}
            aria-current={isActive ? "page" : undefined}
            className={`relative z-10 rounded-full px-4 py-2 text-sm font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 ${
              isActive ? "text-white" : "text-mist-400 hover:text-mist-200"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
      {indicator && (
        <span
          aria-hidden="true"
          className="absolute top-1/2 z-0 h-9 -translate-y-1/2 rounded-full bg-gradient-to-r from-brand-600 to-bloom-600 shadow-[0_0_20px_-4px_var(--color-brand-600)] transition-all duration-300 ease-out motion-reduce:transition-none"
          style={{ left: indicator.left, width: indicator.width }}
        />
      )}
    </div>
  );
}