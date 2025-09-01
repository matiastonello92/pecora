import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold">Pagina non trovata</h1>
      <p className="mt-2 text-sm text-gray-600">
        La pagina che cerchi non esiste o è stata spostata.
      </p>
      <div className="mt-6">
        <Link href="/" className="underline">Torna alla dashboard</Link>
      </div>
    </main>
  );
}
