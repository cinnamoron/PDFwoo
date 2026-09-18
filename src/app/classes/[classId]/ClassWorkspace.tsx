"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";

export default function ClassWorkspace({ classId }: { classId: string }) {
  const trpc = useTRPC();
  const { data: session, isPending } = authClient.useSession();
  const [email, setEmail] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");

  const classQuery = useQuery(trpc.classes.get.queryOptions({ classId }));
  const assessmentsQuery = useQuery(trpc.assessments.listMine.queryOptions());
  const assignmentRowsQuery = useQuery(trpc.assignments.forClass.queryOptions({ classId }));
  const inviteMutation = useMutation(trpc.classes.invite.mutationOptions());
  const assignMutation = useMutation(trpc.assignments.assign.mutationOptions());

  if (isPending || !session) return <main className="min-h-[calc(100vh-72px)] bg-ink-950" aria-label="Class loading" />;

  const inviteLink = inviteMutation.data ? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/join/${inviteMutation.data.token}` : null;

  async function onInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    await inviteMutation.mutateAsync({ classId, email });
    setEmail("");
  }

  async function onAssignSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAssessmentId || !dueAt) return;
    await assignMutation.mutateAsync({ assessmentId: selectedAssessmentId, classId, dueAt });
    setSelectedAssessmentId("");
    setDueAt("");
    await assignmentRowsQuery.refetch();
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-ink-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bloom-500">Class details</p>
        <h1 className="mt-3 text-3xl font-semibold">{classQuery.data?.class?.name ?? "Class"}</h1>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-[2rem] border border-ink-800 bg-ink-900/55 p-5 sm:p-6">
            <h2 className="text-xl font-semibold">Invite student</h2>
            <form onSubmit={onInviteSubmit} className="mt-5 space-y-4">
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@example.com" className="h-12 w-full rounded-xl border border-ink-700 bg-ink-950 px-4 focus:border-brand-500 focus:outline-none" />
              <button type="submit" disabled={inviteMutation.isPending || !email.trim()} className="rounded-xl bg-gradient-to-r from-brand-600 to-bloom-600 px-5 py-3 text-sm font-semibold disabled:opacity-50">Create invite</button>
            </form>
            {inviteLink && (
              <div className="mt-5 rounded-2xl border border-ink-800 bg-ink-950/40 p-4">
                <p className="text-sm text-mist-400">Share this join link</p>
                <p className="mt-2 break-all text-sm text-white">{inviteLink}</p>
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-ink-800 bg-ink-900/55 p-5 sm:p-6">
            <h2 className="text-xl font-semibold">Assign assessment</h2>
            <form onSubmit={onAssignSubmit} className="mt-5 space-y-4">
              <select value={selectedAssessmentId} onChange={(e) => setSelectedAssessmentId(e.target.value)} className="h-12 w-full rounded-xl border border-ink-700 bg-ink-950 px-4 focus:border-brand-500 focus:outline-none">
                <option value="">Choose an assessment</option>
                {(assessmentsQuery.data ?? []).map((assessment) => (
                  <option key={assessment.id} value={assessment.id}>{assessment.title}</option>
                ))}
              </select>
              <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="h-12 w-full rounded-xl border border-ink-700 bg-ink-950 px-4 focus:border-brand-500 focus:outline-none" />
              <button type="submit" disabled={assignMutation.isPending || !selectedAssessmentId || !dueAt} className="rounded-xl bg-gradient-to-r from-brand-600 to-bloom-600 px-5 py-3 text-sm font-semibold disabled:opacity-50">Assign to class</button>
            </form>
          </section>
        </div>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-ink-800 bg-ink-900/55 p-5 sm:p-6">
            <h2 className="text-xl font-semibold">Members</h2>
            <div className="mt-5 space-y-3">
              {(classQuery.data?.members ?? []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-ink-700 p-4 text-sm text-mist-400">No students joined yet.</div>
              ) : (
                (classQuery.data?.members ?? []).map((member) => (
                  <div key={member.id} className="rounded-2xl border border-ink-800 bg-ink-950/35 p-3">
                    <p className="text-sm font-semibold text-white">{member.name}</p>
                    <p className="text-xs text-mist-400">{member.email}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-ink-800 bg-ink-900/55 p-5 sm:p-6">
            <h2 className="text-xl font-semibold">Assignments</h2>
            <div className="mt-5 space-y-3">
              {(assignmentRowsQuery.data ?? []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-ink-700 p-4 text-sm text-mist-400">No assignments for this class yet.</div>
              ) : (
                (assignmentRowsQuery.data ?? []).map((assignment) => (
                  <div key={assignment.id} className="rounded-2xl border border-ink-800 bg-ink-950/35 p-3">
                    <p className="text-sm font-semibold text-white">{assignment.assessmentTitle}</p>
                    <p className="mt-1 text-xs text-mist-400">Due {new Date(assignment.dueAt).toLocaleString()} · {assignment.completedCount} completed</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
