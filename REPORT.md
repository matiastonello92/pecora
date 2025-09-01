## Report

### Problemi risolti

- 404/not-found crash dovuto a hook client senza boundary – **FIXED**
- Supabase SSR ancora su API 0.5 con `getAll`/`setAll` deprecati – **FIXED**
- Segreti hardcoded nei config Supabase – **FIXED**
- Mancanza di route boundaries (`error`, `loading`) – **FIXED**
- Header/Sidebar senza `<Suspense>` e con hook client in RSC – **FIXED**

### Diff principali

- `utils/supabase/server.ts`, `utils/supabase/client.ts`, `utils/supabase/middleware.ts`: migrazione a @supabase/ssr 0.7 e nuova cookie API.
- `utils/supabase/config.ts`, `.env.example`: rimozione fallback hardcoded.
- `app/not-found.tsx`, `app/error.tsx`, `app/loading.tsx`: aggiunte boundary di routing.
- `components/nav/HeaderClient.tsx`, `components/nav/SidebarClient.tsx`, `app/layout.tsx`: separazione client/server e `<Suspense>`.

### Note migrazione 0.5 → 0.7

La versione 0.7 di `@supabase/ssr` depreca `cookies.getAll()/setAll()` in favore di `get/set/remove`. La middleware e il client server usano ora la nuova interfaccia e la gestione dei cookie è sincrona in Next.js 15.

### Build

Lint, typecheck e build eseguiti localmente senza fetch esterni grazie al font Inter self-hosted.

