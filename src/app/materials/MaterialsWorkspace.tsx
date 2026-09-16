"use client";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useAppSelector } from "@/hooks/hooks";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";

const maxFileSize = 25 * 1024 * 1024;

type UploadState = "idle" | "selected" | "uploading" | "success" | "error";

export default function MaterialsWorkspace() {
  const role = useAppSelector((state) => state.nav.role);
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const trpc = useTRPC();
  const requestUpload = useMutation(trpc.materials.requestUpload.mutationOptions());
  const uploadFileMutation = useMutation(trpc.materials.uploadFile.mutationOptions());
  const confirmUpload = useMutation(trpc.materials.confirmUpload.mutationOptions());
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  if (isSessionPending || !session) {
    return <main className="min-h-[calc(100vh-72px)] bg-ink-950" aria-label="Loading study materials" />;
  }

  if (role !== "teacher") {
    return (
      <main className="min-h-[calc(100vh-72px)] bg-ink-950 px-4 py-16 text-white sm:px-6 lg:px-8">
        <section className="mx-auto max-w-3xl border border-ink-800 bg-ink-900/60 p-8 sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bloom-500">Teacher workspace</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Study materials are teacher-managed.</h1>
          <p className="mt-4 max-w-xl leading-7 text-mist-400">Switch to the teacher view to upload source PDFs for your assessments.</p>
          <Link href="/dashboard" className="mt-8 inline-flex rounded-full bg-gradient-to-r from-brand-600 to-bloom-600 px-5 py-3 text-sm font-semibold text-white">Back to dashboard</Link>
        </section>
      </main>
    );
  }

  function chooseFile(nextFile: File | undefined) {
    setMessage("");
    setUploadState("idle");
    setProgress(0);

    if (!nextFile) return;
    if (nextFile.type !== "application/pdf") {
      setFile(null);
      setUploadState("error");
      setMessage("Choose a PDF file to continue.");
      return;
    }
    if (nextFile.size > maxFileSize) {
      setFile(null);
      setUploadState("error");
      setMessage("That file is larger than the 25 MB limit.");
      return;
    }

    setFile(nextFile);
    setUploadState("selected");
  }

  async function uploadFile() {
    if (!file) return;

    setUploadState("uploading");
    setProgress(0);
    setMessage("");

    try {
      const { materialId } = await requestUpload.mutateAsync({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });

      await uploadFileMutation.mutateAsync({
        materialId,
        fileData: await fileToBase64(file, setProgress),
        mimeType: file.type as "application/pdf",
      });
      await confirmUpload.mutateAsync({ materialId });
      setUploadState("success");
      setProgress(100);
      setMessage("Your material is ready for assessment creation.");
    } catch (error) {
      setUploadState("error");
      setMessage(getErrorMessage(error));
    }
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-ink-950 text-white">
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pt-14">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.68fr] lg:items-start">
          <section>
            <Link href="/dashboard" className="text-sm text-mist-400 transition-colors hover:text-white">← Dashboard</Link>
            <p className="mt-10 text-xs font-semibold uppercase tracking-[0.18em] text-bloom-500">Source library / Teacher view</p>
            <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-6xl">Bring the material into focus.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-mist-400">Upload a lecture, chapter, or study guide as a PDF. Keep the source close to the assessment it will shape.</p>

            <div
              onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => { event.preventDefault(); setIsDragging(false); chooseFile(event.dataTransfer.files[0]); }}
              className={`mt-10 border border-dashed p-4 transition-colors sm:p-6 ${isDragging ? "border-bloom-500 bg-bloom-500/10" : "border-ink-700 bg-ink-900/55"}`}
            >
              <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0])} />
              <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-64 w-full flex-col items-center justify-center border border-ink-800 bg-ink-950/45 px-5 text-center transition-colors hover:border-brand-500/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600/20 to-bloom-600/20 text-bloom-500"><UploadIcon /></span>
                <span className="mt-5 text-lg font-semibold">Drop a PDF here</span>
                <span className="mt-2 text-sm text-mist-400">or choose a file from your computer</span>
                <span className="mt-5 text-xs uppercase tracking-[0.14em] text-mist-400">PDF only · up to 25 MB</span>
              </button>
            </div>

            {file && (
              <div className="mt-4 flex items-center justify-between gap-4 border border-ink-800 bg-ink-900/70 p-4">
                <div className="flex min-w-0 items-center gap-3"><PdfIcon /><div className="min-w-0"><p className="truncate text-sm font-semibold">{file.name}</p><p className="mt-1 text-xs text-mist-400">{formatBytes(file.size)}</p></div></div>
                {uploadState !== "uploading" && uploadState !== "success" && <button type="button" onClick={() => { setFile(null); setUploadState("idle"); setMessage(""); }} className="shrink-0 text-sm text-mist-400 hover:text-white">Remove</button>}
              </div>
            )}

            {uploadState === "uploading" && <div className="mt-5"><div className="flex justify-between text-sm"><span className="text-mist-300">Uploading source</span><span className="text-bloom-500">{progress}%</span></div><div className="mt-3 h-2 overflow-hidden bg-ink-800"><div className="h-full bg-gradient-to-r from-brand-600 to-bloom-600 transition-[width] duration-300" style={{ width: `${progress}%` }} /></div></div>}
            {message && <p className={`mt-4 text-sm ${uploadState === "success" ? "text-emerald-300" : "text-red-300"}`} role="status">{message}</p>}
            <button type="button" onClick={uploadFile} disabled={!file || uploadState === "uploading" || uploadState === "success"} className="mt-7 rounded-full bg-gradient-to-r from-brand-600 to-bloom-600 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_-12px_var(--color-brand-600)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40">{uploadState === "uploading" ? "Uploading..." : uploadState === "success" ? "Material uploaded" : "Upload material"}</button>
          </section>

          <aside className="border-l border-ink-800 pl-0 lg:mt-24 lg:pl-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">What happens next</p>
            <ol className="mt-6 divide-y divide-ink-800">
              {["Your PDF is stored securely in your source library.", "The material becomes available when you create an assessment.", "You review every concept and question before publishing."].map((item, index) => <li key={item} className="flex gap-4 py-5 first:pt-0"><span className="text-sm font-semibold text-mist-400">0{index + 1}</span><span className="text-sm leading-6 text-mist-300">{item}</span></li>)}
            </ol>
          </aside>
        </div>
      </div>
    </main>
  );
}

async function fileToBase64(file: File, onProgress: (value: number) => void) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    onProgress(Math.min(99, Math.round(((offset + chunkSize) / bytes.length) * 100)));
  }

  return btoa(binary);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "The material could not be uploaded. Try again.";
}

function formatBytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadIcon() { return <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true"><path d="M12 16V4m0 0L7 9m5-5 5 5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function PdfIcon() { return <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-400/10 text-xs font-bold text-red-300">PDF</span>; }