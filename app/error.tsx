'use client';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html>
      <body>
        <main className="mx-auto max-w-xl p-6">
          <h1 className="text-2xl font-semibold">Si è verificato un errore</h1>
          <p className="mt-2 opacity-80">Riprova più tardi.</p>
          {process.env.NODE_ENV !== 'production' && (
            <pre className="mt-4 whitespace-pre-wrap text-sm opacity-70">{error.message}</pre>
          )}
        </main>
      </body>
    </html>
  );
}

