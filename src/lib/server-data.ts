import { createHash, timingSafeEqual } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";

export type SharedItem = {
  id: string;
  token: string;
  kind: "file" | "text";
  title: string | null;
  text_content: string | null;
  file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  storage_path: string | null;
  created_at: string;
};

export type SharedItemWithUrl = SharedItem & { url: string | null };

export type ItemView = {
  id: string;
  item_id: string;
  ip_address: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  timezone: string | null;
  latitude: number | null;
  longitude: number | null;
  user_agent: string | null;
  opened_at: string;
};

export type AdminItem = SharedItem & { views: ItemView[] };

export function makeToken(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += b.toString(36).padStart(2, "0");
  return out.slice(0, 16);
}

export function sanitizeFileName(name: string): string {
  const base = (name.split(/[/\\]/).pop() ?? "file").trim();
  const clean = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "");
  return (clean || "file").slice(0, 120);
}

function passwordMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

/** Public: fetch a shared item by token and mint a 7-day signed file URL. */
export const getSharedItem = createServerFn({ method: "GET" })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }): Promise<SharedItemWithUrl | null> => {
    const token = String(data?.token ?? "").trim();
    if (!token || token.length > 40) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: item, error } = await supabaseAdmin
      .from("shared_items")
      .select("*")
      .eq("token", token)
      .maybeSingle();
    if (error || !item) return null;
    let url: string | null = null;
    if (item.kind === "file" && item.storage_path) {
      const { data: signed } = await supabaseAdmin.storage
        .from("shared-files")
        .createSignedUrl(item.storage_path, 60 * 60 * 24 * 7);
      url = signed?.signedUrl ?? null;
    }
    return { ...(item as SharedItem), url };
  });

/** Admin-protected: dashboard listing every drop with its view log. */
export const adminGetDashboard = createServerFn({ method: "POST" })
  .inputValidator((input: { passcode: string }) => input)
  .handler(
    async ({ data }): Promise<{ ok: boolean; error?: string; items?: AdminItem[] }> => {
      const expected = process.env["ADMIN_PASSCODE"] ?? "";
      if (!expected) return { ok: false, error: "ADMIN_PASSCODE_NOT_SET" };
      if (!passwordMatches(String(data?.passcode ?? ""), expected)) {
        return { ok: false, error: "INVALID_PASSCODE" };
      }
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: rows, error } = await supabaseAdmin
        .from("shared_items")
        .select("*, item_views(*)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) return { ok: false, error: "DB_ERROR" };
      const items = (rows ?? []).map((row) => ({
        ...row,
        views: ((row as { item_views?: ItemView[] }).item_views ?? []).sort(
          (a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime(),
        ),
      })) as AdminItem[];
      return { ok: true, items };
    },
  );
