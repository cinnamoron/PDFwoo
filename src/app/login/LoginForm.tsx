"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useAppDispatch, useAppSelector } from "@/hooks/hooks";
import { authClient } from "@/lib/auth-client";
import {
  clearAuthError,
  loginFailed,
  loginStarted,
  setAuthMode,
  setConfirmPassword,
  setEmail,
  setName,
  setPassword,
  signupFailed,
  signupStarted,
} from "@/redux/slices/authSlice";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const dispatch = useAppDispatch();
  const { mode, name, email, password, confirmPassword, error, status } = useAppSelector(
    (state) => state.auth
  );
  const isSubmitting = status === "submitting";
  const isSignup = mode === "signup";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSignup) {
      if (password !== confirmPassword) {
        dispatch(signupFailed("Passwords don't match."));
        return;
      }

      dispatch(signupStarted());
      try {
        const result = await authClient.signUp.email({
          name,
          email,
          password,
          callbackURL: callbackUrl,
        });

        if (result.error) {
          dispatch(signupFailed(result.error.message || "We could not create your account. Please try again."));
        } else {
          router.replace(callbackUrl);
        }
      } catch {
        dispatch(signupFailed("We could not reach the sign-up service. Please try again."));
      }
      return;
    }

    dispatch(loginStarted());
    try {
      const result = await authClient.signIn.email({
        email,
        password,
        callbackURL: callbackUrl,
      });

      if (result.error) {
        dispatch(loginFailed(result.error.message || "We could not sign you in. Check your details and try again."));
      } else {
        router.replace(callbackUrl);
      }
    } catch {
      dispatch(loginFailed("We could not reach the sign-in service. Please try again."));
    }
  }

  return (
    <main className="relative flex min-h-[calc(100vh-72px)] flex-1 items-center justify-center overflow-hidden bg-ink-950 px-4 py-12 sm:px-6 lg:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,var(--color-ink-800)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-ink-800)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/4 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-600/20 blur-3xl" />

      <section className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-ink-700/70 bg-ink-900/90 shadow-2xl shadow-black/30 lg:grid-cols-[1fr_1.05fr]">
        <div className="hidden flex-col justify-between border-r border-ink-700/70 p-10 lg:flex">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-bloom-500">ConceptIQ</p>
            <h1 className="mt-16 max-w-sm text-4xl font-semibold leading-tight tracking-tight text-white">
              Turn learning gaps into your next breakthrough.
            </h1>
            <p className="mt-5 max-w-sm text-base leading-7 text-mist-400">
              {isSignup
                ? "Create an account to start tracking concept gaps and turning them into progress."
                : "Sign in to continue your assessment workspace and pick up where your progress left off."}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-mist-400">
            <span className="h-2 w-2 rounded-full bg-bloom-500 shadow-[0_0_14px_var(--color-bloom-500)]" />
            Your learning workspace, in focus.
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <div className="mx-auto max-w-md">
            <div className="lg:hidden">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-bloom-500">ConceptIQ</p>
            </div>
            <h2 className="mt-8 text-3xl font-semibold tracking-tight text-white lg:mt-0">
              {isSignup ? "Create your account" : "Welcome back"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-mist-400">
              {isSignup ? "Sign up to get started." : "Sign in to access your dashboard."}
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {isSignup && (
                <div>
                  <label htmlFor="name" className="text-sm font-medium text-mist-300">Full name</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(event) => {
                      dispatch(setName(event.target.value));
                      if (error) dispatch(clearAuthError());
                    }}
                    className="mt-2 h-12 w-full rounded-xl border border-ink-700 bg-ink-950 px-4 text-sm text-white outline-none transition-colors placeholder:text-mist-400/60 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    placeholder="Your name"
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="text-sm font-medium text-mist-300">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => {
                    dispatch(setEmail(event.target.value));
                    if (error) dispatch(clearAuthError());
                  }}
                  className="mt-2 h-12 w-full rounded-xl border border-ink-700 bg-ink-950 px-4 text-sm text-white outline-none transition-colors placeholder:text-mist-400/60 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-4">
                  <label htmlFor="password" className="text-sm font-medium text-mist-300">Password</label>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  required
                  value={password}
                  onChange={(event) => {
                    dispatch(setPassword(event.target.value));
                    if (error) dispatch(clearAuthError());
                  }}
                  className="mt-2 h-12 w-full rounded-xl border border-ink-700 bg-ink-950 px-4 text-sm text-white outline-none transition-colors placeholder:text-mist-400/60 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  placeholder="Enter your password"
                />
              </div>

              {isSignup && (
                <div>
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-mist-300">Confirm password</label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(event) => {
                      dispatch(setConfirmPassword(event.target.value));
                      if (error) dispatch(clearAuthError());
                    }}
                    className="mt-2 h-12 w-full rounded-xl border border-ink-700 bg-ink-950 px-4 text-sm text-white outline-none transition-colors placeholder:text-mist-400/60 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    placeholder="Re-enter your password"
                  />
                </div>
              )}

              {error && (
                <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-200">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-brand-600 to-bloom-600 px-4 text-sm font-semibold text-white shadow-[0_10px_28px_-12px_var(--color-brand-600)] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
              >
                {isSubmitting
                  ? isSignup
                    ? "Creating your account..."
                    : "Signing you in..."
                  : isSignup
                    ? "Create account"
                    : "Sign in"}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-mist-400">
              {isSignup ? (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => dispatch(setAuthMode("login"))}
                    className="font-medium text-brand-500 hover:text-brand-400"
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  Need an account?{" "}
                  <button
                    type="button"
                    onClick={() => dispatch(setAuthMode("signup"))}
                    className="font-medium text-brand-500 hover:text-brand-400"
                  >
                    Sign up
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}