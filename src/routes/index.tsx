import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "RDX Security Zone — Share pictures, files & messages securely" },
      {
        name: "description",
        content:
          "Send pictures, voice notes, files and messages through secure links — and see who opened them.",
      },
      { property: "og:title", content: "RDX Security Zone — Secure sharing" },
      {
        property: "og:description",
        content:
          "Send pictures, voice notes, files and messages through secure links — and see who opened them.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type Mode = "text" | "file";
type Result = { token: string; url: string };

function Home() {
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setResult(null);
    setText("");
    setTitle("");
    setFile(null);
    setCopied(false);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const shareUrl = result ? `${window.location.origin}${result.url}` : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — the link is still selectable
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      let res: Response;
      if (mode === "text") {
        if (!text.trim()) {
          setError("Type a message first.");
          setBusy(false);
          return;
        }
        res = await fetch("/api/public/upload", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text, title: title.trim() || undefined }),
        });
      } else {
        if (!file) {
          setError("Choose a file first.");
          setBusy(false);
          return;
        }
        const form = new FormData();
        form.append("file", file);
        if (title.trim()) form.append("title", title.trim());
        res = await fetch("/api/public/upload", { method: "POST", body: form });
      }
      const data = (await res.json()) as { ok: boolean; token?: string; url?: string; error?: string };
      if (!res.ok || !data.ok || !data.url) {
        setError(data.error ?? "Something went wrong. Try again.");
      } else {
        setResult({ token: data.token ?? "", url: data.url });
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) {
      setError("File is larger than the 50 MB limit.");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setError(null);
    setFile(f);
  };

  return (
    <div className="rdx-grid-bg min-h-screen px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-center gap-2">
          <ShieldIcon className="h-6 w-6 text-primary" />
          <span className="font-display text-sm font-bold tracking-[0.25em] text-foreground">
            RDX SECURITY ZONE
          </span>
        </div>

        {result ? (
          <div className="rdx-panel rdx-glow p-6 sm:p-8">
            <p className="rdx-label mb-1">SECURE LINK READY</p>
            <h1 className="font-display text-xl font-bold text-foreground">Share this link</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Anyone with this link can open it. You'll see when they do — and from where — in your{" "}
              <a href="/admin" className="text-primary underline-offset-4 hover:underline">
                admin portal
              </a>
              .
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-lg border px-3 py-2.5 font-display text-sm"
                style={{ backgroundColor: "var(--color-secondary)", borderColor: "var(--color-border)" }}
              />
              <button
                type="button"
                onClick={copy}
                className="rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-foreground)" }}
              >
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
            <div className="mt-6 flex items-center justify-between border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
              <a href={result.url} className="text-sm text-info hover:underline" style={{ color: "var(--color-info)" }}>
                Preview the link →
              </a>
              <button type="button" onClick={reset} className="text-sm text-muted-foreground hover:text-foreground">
                Create another
              </button>
            </div>
          </div>
        ) : (
          <div className="rdx-panel p-6 sm:p-8">
            <p className="rdx-label mb-1">NEW SECURE DROP</p>
            <h1 className="font-display text-2xl font-bold text-foreground">Share anything, securely</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Pictures, voice notes, files or a message. A private link is generated — only people you send it to can open it.
            </p>

            <div className="mt-6 inline-flex rounded-lg border p-1" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-muted)" }}>
              {(
                [
                  ["text", "Message"],
                  ["file", "File / Photo / Voice"],
                ] as [Mode, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setMode(value); setError(null); }}
                  className={cn(
                    "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                    mode === value ? "rdx-glow" : "text-muted-foreground hover:text-foreground",
                  )}
                  style={mode === value ? { backgroundColor: "var(--color-primary)", color: "var(--color-primary-foreground)" } : undefined}
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === "text" ? (
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={6}
                  maxLength={20000}
                  placeholder="Type your message…"
                  className="w-full rounded-lg border p-4 text-base leading-relaxed"
                  style={{ backgroundColor: "var(--color-secondary)", borderColor: "var(--color-border)" }}
                />
              ) : (
                <label
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center transition-colors hover:border-primary"
                  style={{ borderColor: file ? "var(--color-primary)" : "var(--color-border)", backgroundColor: "var(--color-secondary)" }}
                >
                  <ShieldIcon className="h-8 w-8 text-primary" />
                  <span className="mt-3 text-sm font-medium text-foreground">
                    {file ? file.name : "Choose a picture, voice note or any file"}
                  </span>
                  <span className="mt-1 text-xs text-muted-foreground">Up to 50 MB</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="Optional title"
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
                style={{ backgroundColor: "var(--color-secondary)", borderColor: "var(--color-border)" }}
              />

              {error ? (
                <p className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--color-destructive)", color: "var(--color-destructive)" }}>
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg px-5 py-3 font-display text-sm font-bold tracking-widest transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-foreground)" }}
              >
                {busy ? "CREATING…" : "CREATE SECURE LINK"}
              </button>
            </form>

            <p className="mt-6 border-t pt-4 text-center text-xs text-muted-foreground" style={{ borderColor: "var(--color-border)" }}>
              <span className="font-display tracking-wider">ADMIN?</span>{" "}
              <a href="/admin" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                Open the tracking portal
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
