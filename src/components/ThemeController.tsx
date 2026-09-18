"use client";

import { useEffect, useState } from "react";
import { useAppDispatch } from "@/hooks/hooks";
import { useAppSelector } from "@/hooks/hooks";
import { setRole, type UserRole } from "@/redux/slices/navSlice";

export default function ThemeController({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const role = useAppSelector((state) => state.nav.role);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storedRole = window.localStorage.getItem("conceptiq-role");
    if (storedRole === "teacher" || storedRole === "student") {
      dispatch(setRole(storedRole as UserRole));
    }
    setHydrated(true);
  }, [dispatch]);

  return <div className={role === "student" ? "theme-student" : ""}>{hydrated ? children : null}</div>;
}
