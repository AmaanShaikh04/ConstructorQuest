import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { loadGame } from "@/lib/game";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

export const metadata = { title: "Checkpoint QR codes — print sheet" };

/**
 * One A4 page per checkpoint: big QR, checkpoint name, and a reminder for the
 * volunteer holding it. Print, laminate, hand out.
 */
export default async function PrintPage() {
  if (!(await requireAdmin())) redirect("/");

  const { checkpoints } = await loadGame();
  const list = Object.values(checkpoints).sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-dvh bg-white text-black">
      <div className="no-print sticky top-0 flex items-center justify-between border-b border-neutral-300 bg-neutral-100 px-6 py-3">
        <p className="text-sm text-neutral-700">
          {list.length} pages — one per checkpoint. Print at 100% scale.
        </p>
        <PrintButton />
      </div>

      {list.map((cp) => (
        <section
          key={cp.id}
          className="print-page mx-auto flex max-w-[760px] flex-col items-center px-10 py-14 text-center"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
            Constructor Quest · Uni Games 2026
          </p>
          <h1 className="mt-2 text-4xl font-bold">{cp.name}</h1>
          <p className="mt-1 text-lg text-neutral-600">{cp.fullName}</p>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/admin/qr/${cp.id}`}
            alt={`QR code for ${cp.name}`}
            width={420}
            height={420}
            className="my-8 h-[420px] w-[420px]"
          />

          <p className="font-mono text-2xl tracking-wider">{cp.qrCode}</p>

          <div className="mt-8 max-w-[520px] rounded-lg border border-neutral-300 p-4 text-left text-sm text-neutral-700">
            <p className="mb-1 font-semibold text-black">Volunteer, please:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Stay at this checkpoint for the whole event.</li>
              <li>Hold this sheet up for teams to scan — don&apos;t hand it over.</li>
              <li>Never leave it face-up and unattended; codes must not be photographed.</li>
              <li>
                Watch the bonus challenge if they attempt it:{" "}
                <span className="italic">{cp.bonus}</span>
              </li>
              <li>Report anything odd to HQ. QR tampering means disqualification.</li>
            </ul>
          </div>
        </section>
      ))}
    </div>
  );
}
