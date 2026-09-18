"use client";

import { useAppSelector } from "@/hooks/hooks";

export default function ThemeController({ children }: { children: React.ReactNode }) {
  const role = useAppSelector((state) => state.nav.role);

  return <div className={role === "student" ? "theme-student" : ""}>{children}</div>;
}
