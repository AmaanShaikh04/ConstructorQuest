import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { loadGame } from "@/lib/game";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

export const metadata = { title: "Checkpoint QR codes — print sheet" };

export default async function PrintPage() {
  if (!(await requireAdmin())) redirect("/");

  const { checkpoints } = await loadGame();
  const list = Object.values(checkpoints).sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-dvh bg-white">
      <div className="no-print sticky top-0 flex items-center justify-between border-b border-neutral-300 bg-neutral-100 px-6 py-3">
        <p className="text-sm text-neutral-700">
          {list.length} QR posters — one per page. Use &quot;Print to PDF&quot; to save.
        </p>
        <PrintButton />
      </div>

      {list.map((cp) => (
        <section
          key={cp.id}
          className="print-page flex items-center justify-center"
          style={{ width: "100%", pageBreakAfter: "always", breakAfter: "page" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/admin/qr/${cp.id}`}
            alt={`QR code for ${cp.name}`}
            style={{ width: "100%", maxWidth: "720px", display: "block" }}
          />
        </section>
      ))}
    </div>
  );
}
