import QRCode from "qrcode";
import { db } from "@/lib/supabase";
import { requireAdmin } from "@/lib/session";
import { fail, handler } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Render one checkpoint's QR as a PNG, for printing. HQ only — these images
 * are the physical checkpoint flags, so they must not be publicly fetchable.
 */
export const GET = handler(async (_req, { params }) => {
  if (!(await requireAdmin())) return fail("HQ access only.", 401);

  const { id } = await params;

  const { data, error } = await db()
    .from("checkpoints")
    .select("id, qr_code")
    .eq("id", id)
    .maybeSingle();

  if (error) return fail(error.message, 500);
  if (!data) return fail("Unknown checkpoint.", 404);

  const png = await QRCode.toBuffer(data.qr_code, {
    type: "png",
    errorCorrectionLevel: "H", // survives a crease and a windy Bremen afternoon
    margin: 2,
    width: 900,
  });

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="${data.id}-qr.png"`,
    },
  });
});
