import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-72px)] flex-1 bg-ink-950" />}>
      <LoginForm />
    </Suspense>
  );
}
