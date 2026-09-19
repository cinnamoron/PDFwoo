"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";

export default function ClassesWorkspace() {
  const router = useRouter();
  const trpc = useTRPC();
  const { data: session, isPending } = authClient.useSession();
  const [name, setName] = useState("");

  const classesQuery = useQuery(trpc.classes.myClasses.queryOptions(undefined, { enabled: !isPending && Boolean(session) }));
  const createClass = useMutation(trpc.classes.create.mutationOptions());

  if (isPending || !session) {
    return <main className="min-h-[calc(100vh-72px)] bg-ink-950" aria-label="Loading classes" />;
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await createClass.mutateAsync({ name });
    setName("");
    router.push(`/classes/${result.id}`);
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-ink-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bloom-500">Classes</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Manage your classrooms</h1>
          </div>
        </div>

        <section className="mt-8 rounded-[2rem] border border-ink-800 bg-ink-900/55 p-6">
          <form onSubmit={handleCreate} className="flex flex-col gap-4 sm:flex-row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New class name"
              className="h-12 flex-1 rounded-xl border border-ink-700 bg-ink-950 px-4 text-sm text-white placeholder:text-mist-400/70 focus:border-brand-500 focus:outline-none"
            />
            <button type="submit" disabled={createClass.isPending || !name.trim()} className="rounded-xl bg-gradient-to-r from-brand-600 to-bloom-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
              {createClass.isPending ? "Creating..." : "Create class"}
            </button>
          </form>
        </section>

        <section className="mt-10 rounded-[2rem] border border-ink-800 bg-ink-900/55 p-5 sm:p-6">
          <h2 className="text-xl font-semibold">Your classes</h2>
          <div className="mt-5 space-y-3">
            {(classesQuery.data ?? []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-950/30 p-4 text-sm text-mist-400">No classes yet.</div>
            ) : (
              (classesQuery.data ?? []).map((row) => (
                <Link key={row.id} href={`/classes/${row.id}`} className="flex flex-col gap-3 rounded-2xl border border-ink-800 bg-ink-950/35 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-base font-semibold text-white">{row.name}</p>
                    <p className="mt-1 text-xs text-mist-400">{row.memberCount} members · {row.pendingInviteCount} pending invites</p>
                  </div>
                  <span className="inline-flex rounded-full border border-brand-500/50 bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-200">Open</span>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
