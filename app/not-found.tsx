import Link from "next/link";
import { Suspense } from "react";
import NotFoundQuery from "./not-found.client";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold">Pagina non trovata</h1>
      <p className="mt-2 text-sm text-gray-600">
        La pagina che cerchi non esiste o è stata spostata.
      </p>

      {/* Se non servono i query param, puoi rimuovere del tutto <Suspense><NotFoundQuery/></Suspense> */}
      <Suspense fallback={null}>
        <NotFoundQuery />
      </Suspense>

      <div className="mt-6">
        <Link href="/" className="underline">
          Torna alla dashboard
        </Link>
      </div>
    </main>
  );
}

