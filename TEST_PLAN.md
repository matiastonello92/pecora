## Test Plan

1. Navigazione generale
   - Visitare home, login e logout.
   - Accedere ad aree protette per ruoli base/manager/admin.
   - Verificare pagina not-found e boundary di errore.
2. Verifica client/server
   - Ricerca nel codice di `usePathname`/`useSearchParams` fuori da componenti client.
3. Supabase session
   - Login, refresh della pagina e conferma persistenza cookie/sessione.
4. Resend
   - Verificare assenza di side-effect durante il render; invii solo tramite azioni server.
5. Qualità del codice
   - `bun run lint`
   - `bun run typecheck` (se disponibile)
   - `bun run build`
6. API di base
   - `/api/health` → 200
   - `/api/internal/setup/apply-migrations`
     - senza token → 401
     - `APP_SETUP_LOCKED=true` → 423
     - token ok ma DB mancante → 503
     - token ok e DB presente → 200 con `{ ok: true, migrated >= 0 }`
   - `/api/v1/admin/bootstrap`
     - schema mancante → 422
     - service-role mancante → 503
     - successo → 200 con payload coerente

