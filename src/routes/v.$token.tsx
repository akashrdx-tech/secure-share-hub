import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { SharedItemWithUrl } from "@/lib/server-data";
import { getSharedItem } from "@/lib/server-data";

export const Route = createFileRoute("/v/$token")({
  loader: ({ params }): Promise<SharedItemWithUrl | null> =>
    getSharedItem({ data: { token: params.token } }),
  component: ViewDrop,
  head: ({ loaderData }) => {
    const item = loaderData as SharedItemWithUrl | null;
    const label = item
      ? item.title || item.file_name || (item.kind === "text" ? "Secure message" : "Secure drop")
      : "Drop not found";
    return {
      meta: [
        { title: `RDX Security Zone — ${label}` },
        { name: "description", content: "A secure drop shared via RDX Security Zone." },
        { property: "og:title", content: label },
        { property: "og:description", content: "A secure drop shared via RDX Security Zone." },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
});

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ViewDrop() {
  const item = Route.useLoaderData();
  const token = Route.useParams().token;

  useEffect(() => {
    if (!item) return;
    try {
      const key = `rdx-opened-${token}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      fetch("/api/public/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      }).catch(() => {});
    } catch {
      // tracking is best-effort
    }
  }, [item, token]);

  if (!item) {
    return (
      <div className="rdx-grid-bg flex min-h-screen items-center justify-center px-4">
        <div className="rdx-panel max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: "var(--color-destructive)" }}>
            <span className="text-2xl" style={{ color: "var(--color-destructive-foreground)" }}>!</span>
          </div>
          <h1 className="font-display text-xl font-bold tracking-widest text-foreground">
            LINK NOT FOUND
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This drop doesn't exist, was removed, or the link is incorrect.
          </p>
        </div>
      </div>
    );
  }

  const mime = item.mime_type ?? "";
  const isImage = mime.startsWith("image/");
  const isVideo = mime.startsWith("video/");
  const isAudio = mime.startsWith("audio/");
  const heading = item.title || item.file_name || (item.kind === "text" ? "Secure message" : "Secure drop");

  return (
    <div className="rdx-grid-bg min-h-screen px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-center gap-2">
          <ShieldIcon className="h-6 w-6 text-primary" />
          <span className="font-display text-sm font-bold tracking-[0.25em] text-foreground">
            RDX SECURITY ZONE
          </span>
        </div>

        <div className="rdx-panel p-6 sm:p-8">
          <p className="rdx-label mb-1">SECURE DROP</p>
          <h1 className="font-display text-2xl font-bold break-words text-foreground">{heading}</h1>
          <div
            className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs"
            style={{ backgroundColor: "var(--color-secondary)" }}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--color-info)" }} />
            <span className="text-muted-foreground">
              {item.kind === "text" ? "Message" : item.file_name}
              {item.file_size ? ` · ${(item.file_size / 1024 / 1024).toFixed(2)} MB` : ""}
            </span>
          </div>

          <div className="mt-6">
            {item.kind === "text" && item.text_content ? (
              <div
                className="rounded-lg border p-4 text-base leading-relaxed whitespace-pre-wrap break-words"
                style={{ backgroundColor: "var(--color-secondary)" }}
              >
                {item.text_content}
              </div>
            ) : null}

            {isImage && item.url ? (
              <img
                src={item.url}
                alt={heading}
                className="mx-auto max-h-[70vh] w-auto rounded-lg border"
              />
            ) : null}

            {isVideo && item.url ? (
              <video src={item.url} controls className="mx-auto max-h-[70vh] w-full rounded-lg" />
            ) : null}

            {isAudio && item.url ? (
              <audio src={item.url} controls className="w-full" />
            ) : null}

            {!isImage && !isVideo && !isAudio && item.kind === "file" ? (
              <div className="rounded-lg border p-6 text-center">
                <p className="text-sm text-muted-foreground">{item.file_name}</p>
                {item.url ? (
                  <a
                    href={item.url}
                    download={item.file_name ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
                    style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-foreground)" }}
                  >
                    Download file
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>

          <p className="mt-8 border-t pt-4 text-center text-xs text-muted-foreground" style={{ borderColor: "var(--color-border)" }}>
            <span className="font-display tracking-wider">NOTE:</span> this open is logged — the sender can see the IP and location in their admin portal.
          </p>
        </div>
      </div>
    </div>
  );
}
