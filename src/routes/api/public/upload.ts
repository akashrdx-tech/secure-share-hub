import { createFileRoute } from "@tanstack/react-router";
import { makeToken, sanitizeFileName } from "@/lib/server-data";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export const Route = createFileRoute("/api/public/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const contentType = request.headers.get("content-type") ?? "";
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const token = makeToken();

          if (contentType.includes("application/json")) {
            const body = (await request.json()) as { text?: unknown; title?: unknown };
            const text = typeof body.text === "string" ? body.text.trim() : "";
            const title =
              typeof body.title === "string" && body.title.trim()
                ? body.title.trim().slice(0, 120)
                : null;
            if (!text || text.length > 20000) {
              return Response.json(
                { ok: false, error: "Message is empty or too long (max 20,000 chars)." },
                { status: 400 },
              );
            }
            const { error } = await supabaseAdmin
              .from("shared_items")
              .insert({ token, kind: "text", title, text_content: text });
            if (error) {
              return Response.json({ ok: false, error: "Could not save the message." }, { status: 500 });
            }
            return Response.json({ ok: true, token, url: `/v/${token}` });
          }

          const form = await request.formData();
          const file = form.get("file");
          if (!(file instanceof File)) {
            return Response.json({ ok: false, error: "No file received." }, { status: 400 });
          }
          if (file.size <= 0) {
            return Response.json({ ok: false, error: "The file is empty." }, { status: 400 });
          }
          if (file.size > MAX_FILE_SIZE) {
            return Response.json(
              { ok: false, error: "File is larger than the 50 MB limit." },
              { status: 413 },
            );
          }
          const fileName = sanitizeFileName(file.name || "file");
          const mimeType = file.type || "application/octet-stream";
          const titleRaw = form.get("title");
          const title =
            typeof titleRaw === "string" && titleRaw.trim() ? titleRaw.trim().slice(0, 120) : null;

          const buffer = Buffer.from(await file.arrayBuffer());
          const storagePath = `shared/${token}/${fileName}`;
          const { error: uploadError } = await supabaseAdmin.storage
            .from("shared-files")
            .upload(storagePath, buffer, { contentType: mimeType });
          if (uploadError) {
            return Response.json({ ok: false, error: "File upload failed." }, { status: 500 });
          }
          const { error } = await supabaseAdmin.from("shared_items").insert({
            token,
            kind: "file",
            title,
            file_name: fileName,
            mime_type: mimeType,
            file_size: file.size,
            storage_path: storagePath,
          });
          if (error) {
            return Response.json({ ok: false, error: "Could not save the file record." }, { status: 500 });
          }
          return Response.json({ ok: true, token, url: `/v/${token}` });
        } catch {
          return Response.json({ ok: false, error: "Upload failed. Try again." }, { status: 500 });
        }
      },
    },
  },
});
