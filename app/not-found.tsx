import { Suspense } from "react";
import Link from "next/link";
import { NotFoundExtras } from "@/components/not-found-client";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Pagina non trovata</h1>
      <p className="mt-2 text-muted-foreground">La risorsa non esiste o è stata spostata.</p>
      <Suspense fallback={null}>
        <NotFoundExtras />
      </Suspense>
      <div className="mt-6">
        <Link href="/" className="underline">Torna alla home</Link>
      </div>
    </main>
  );
}
