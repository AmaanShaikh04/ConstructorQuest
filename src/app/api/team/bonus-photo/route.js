import { db } from "@/lib/supabase";
import { requireTeam } from "@/lib/session";
import { fail, handler } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Upload a bonus-challenge photo to Supabase Storage; returns a public URL. */
export const POST = handler(async (req) => {
  const teamId = await requireTeam();
  if (!teamId) return fail("Not signed in.", 401);

  const form = await req.formData();
  const file = form.get("photo");
  if (!file || typeof file === "string") return fail("No photo received.");

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const allowed = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
  if (!allowed.includes(ext)) return fail("Only image files are accepted.");
  if (file.size > 10 * 1024 * 1024) return fail("Photo must be under 10 MB.");

  const bytes = await file.arrayBuffer();
  const path = `bonus/${teamId}-${Date.now()}.${ext}`;

  const { error } = await db().storage.from("bonus-photos").upload(path, bytes, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) return fail(`Upload failed: ${error.message}`, 500);

  const { data } = db().storage.from("bonus-photos").getPublicUrl(path);
  return Response.json({ ok: true, url: data.publicUrl });
});
