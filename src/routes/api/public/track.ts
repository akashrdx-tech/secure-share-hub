import { createFileRoute } from "@tanstack/react-router";

type GeoPayload = {
  success?: boolean;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  timezone?: { id?: string };
};

function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  if (ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) return true;
  if (ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
  if (ip.startsWith("172.")) {
    const second = Number.parseInt(ip.split(".")[1] ?? "0", 10);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

export const Route = createFileRoute("/api/public/track")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { token?: unknown };
          const token = typeof body.token === "string" ? body.token.trim().slice(0, 40) : "";
          if (!token) return Response.json({ ok: false }, { status: 400 });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: item } = await supabaseAdmin
            .from("shared_items")
            .select("id")
            .eq("token", token)
            .maybeSingle();
          if (!item) return Response.json({ ok: false }, { status: 404 });

          const headers = request.headers;
          const forwarded = headers.get("x-forwarded-for") ?? "";
          const ip =
            headers.get("cf-connecting-ip") || forwarded.split(",")[0]?.trim() || null;

          let city: string | null = null;
          let region: string | null = null;
          let country: string | null = null;
          let timezone: string | null = null;
          let latitude: number | null = null;
          let longitude: number | null = null;

          if (ip && !isPrivateIp(ip)) {
            try {
              const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
                signal: AbortSignal.timeout(4000),
              });
              const geo = (await res.json()) as GeoPayload;
              if (geo.success) {
                city = geo.city ?? null;
                region = geo.region ?? null;
                country = geo.country ?? null;
                timezone = geo.timezone?.id ?? null;
                latitude = typeof geo.latitude === "number" ? geo.latitude : null;
                longitude = typeof geo.longitude === "number" ? geo.longitude : null;
              }
            } catch {
              // Geolocation is best-effort; never block the view on it.
            }
          }

          await supabaseAdmin.from("item_views").insert({
            item_id: item.id,
            ip_address: ip,
            city,
            region,
            country,
            timezone,
            latitude,
            longitude,
            user_agent: headers.get("user-agent"),
          });
          return Response.json({ ok: true });
        } catch {
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});
