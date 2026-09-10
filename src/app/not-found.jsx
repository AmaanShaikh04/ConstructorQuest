import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink p-6">
      <div className="max-w-sm text-center">
        <h1 className="mb-2 font-serif text-2xl text-parchment">Nothing here</h1>
        <p className="mb-5 text-sm text-muted">
          That&apos;s not one of the seven checkpoints — or any other page.
        </p>
        <Link
          href="/"
          className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink"
        >
          Back to the start
        </Link>
      </div>
    </main>
  );
}
