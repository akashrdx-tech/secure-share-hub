import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { adminGetDashboard, type AdminItem } from "@/lib/server-data";
import { format } from "date-fns";
import ViewerMap from "@/components/rdx-map";

export const Route = createFileRoute("/admin")({
  component: AdminPortal,
  head: () => ({
    meta: [
      { title: "RDX Security Zone — Admin Portal" },
      { name: "description", content: "See who opened your secure drops — IP, location and time." },
      { property: "og:title", content: "RDX Security Zone — Admin Portal" },
      { property: "og:description", content: "See who opened your secure drops — IP, location and time." },
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

function AdminPortal() {
  const [passcode, setPasscode] = useState("");
  const [items, setItems] = useState<AdminItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await adminGetDashboard({ data: { passcode } });
    if (res.ok && res.items) {
      setItems(res.items);
    } else {
      setError(
        res.error === "INVALID_PASSCODE"
          ? "Wrong passcode."
          : res.error === "ADMIN_PASSCODE_NOT_SET"
            ? "The admin passcode isn't configured on the server yet."
            : "Something went wrong. Try again.",
      );
    }
    setBusy(false);
  };

  return (
    <div className="rdx-grid-bg min-h-screen px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-center gap-2">
          <ShieldIcon className="h-6 w-6 text-primary" />
          <span className="font-display text-sm font-bold tracking-[0.25em] text-foreground">
            RDX SECURITY ZONE — ADMIN
          </span>
        </div>

        {items === null ? (
          <form onSubmit={unlock} className="rdx-panel mx-auto max-w-md p-6 sm:p-8">
            <p className="rdx-label mb-1">RESTRICTED ACCESS</p>
            <h1 className="font-display text-xl font-bold text-foreground">Enter admin passcode</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Only you should have this code. It unlocks the list of your drops and every open log.
            </p>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              autoFocus
              className="mt-5 w-full rounded-lg border px-3 py-2.5 font-display text-sm"
              style={{ backgroundColor: "var(--color-secondary)", borderColor: "var(--color-border)" }}
            />
            {error ? (
              <p className="mt-3 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--color-destructive)", color: "var(--color-destructive)" }}>
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="mt-5 w-full rounded-lg px-5 py-3 font-display text-sm font-bold tracking-widest transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-foreground)" }}
            >
              {busy ? "CHECKING…" : "UNLOCK"}
            </button>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              <a href="/" className="underline-offset-4 hover:text-foreground hover:underline">← Back to sharing</a>
            </p>
          </form>
        ) : (
          <Dashboard items={items} />
        )}
      </div>
    </div>
  );
}

function Dashboard({ items }: { items: AdminItem[] }) {
  const totalViews = items.reduce((n, i) => n + i.views.length, 0);
  return (
    <div>
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          ["DROPS", String(items.length)],
          ["TOTAL OPENS", String(totalViews)],
          ["LATEST", items[0] ? format(new Date(items[0].created_at), "d MMM, HH:mm") : "—"],
        ].map(([label, value]) => (
          <div key={label} className="rdx-panel p-4 text-center">
            <p className="rdx-label">{label}</p>
            <p className="mt-1 font-display text-xl font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="rdx-panel p-8 text-center">
          <p className="text-sm text-muted-foreground">No drops yet.</p>
          <a href="/" className="mt-3 inline-block text-sm text-primary hover:underline">Create your first secure link →</a>
        </div>
      ) : (
        <div className="space-y-5">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function ItemCard({ item }: { item: AdminItem }) {
  const [open, setOpen] = useState(true);
  const label = item.title || item.file_name || (item.kind === "text" ? "Secure message" : "Secure drop");
  return (
    <div className="rdx-panel overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-4 p-5 text-left">
        <div className="min-w-0">
          <p className="rdx-label">
            {item.kind === "text" ? "MESSAGE" : "FILE"} · {format(new Date(item.created_at), "d MMM yyyy, HH:mm")}
          </p>
          <h2 className="mt-1 truncate font-display text-base font-bold text-foreground">{label}</h2>
          <div className="mt-1 inline-flex items-center gap-2 rounded-full px-3 py-0.5 text-xs" style={{ backgroundColor: "var(--color-secondary)" }}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.views.length ? "var(--color-destructive)" : "var(--color-border)" }} />
            <span className="text-muted-foreground">
              {item.views.length} open{item.views.length === 1 ? "" : "s"}
              {item.file_size ? ` · ${(item.file_size / 1024 / 1024).toFixed(2)} MB` : ""}
            </span>
          </div>
        </div>
        <span className="font-display text-xs text-muted-foreground">{open ? "HIDE ▲" : "SHOW ▼"}</span>
      </button>

      {open ? (
        <div className="border-t p-5" style={{ borderColor: "var(--color-border)" }}>
          {item.kind === "text" && item.text_content ? (
            <p className="mb-4 max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border p-3 text-sm" style={{ backgroundColor: "var(--color-secondary)", borderColor: "var(--color-border)" }}>
              {item.text_content}
            </p>
          ) : null}
          <a href={`/v/${item.token}`} className="font-display text-xs text-primary hover:underline" style={{ color: "var(--color-primary)" }}>
            OPEN LINK: /v/{item.token}
          </a>

          {item.views.length > 0 ? (
            <>
              <div className="mt-4">
                <ViewerMap views={item.views} />
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="rdx-label border-b" style={{ borderColor: "var(--color-border)" }}>
                      <th className="py-2 pr-4">OPENED</th>
                      <th className="py-2 pr-4">IP ADDRESS</th>
                      <th className="py-2 pr-4">LOCATION</th>
                      <th className="py-2">DEVICE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.views.map((v) => (
                      <tr key={v.id} className="border-b last:border-0" style={{ borderColor: "var(--color-border)" }}>
                        <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">{format(new Date(v.opened_at), "d MMM yyyy, HH:mm:ss")}</td>
                        <td className="py-2 pr-4 font-display text-xs">{v.ip_address ?? "—"}</td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {[v.city, v.region, v.country].filter(Boolean).join(", ") || "Unknown"}
                        </td>
                        <td className="py-2 max-w-52 truncate text-xs text-muted-foreground">{v.user_agent ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Not opened yet.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
