# Auth QA Report

## Diff
```diff
diff --git a/app/admin/flags/page.tsx b/app/admin/flags/page.tsx
index aa56458..be1228e 100644
--- a/app/admin/flags/page.tsx
+++ b/app/admin/flags/page.tsx
@@ -13,6 +13,7 @@ import { Label } from '@/components/ui/label'
 import { Textarea } from '@/components/ui/textarea'
 import { Flag, Plus, Settings, MapPin, Globe } from 'lucide-react'
 import { useAppStore } from '@/lib/store'
+import { useRequireSession } from '@/lib/useRequireSession'
 
 // Mock data for demonstration
 const mockFlags = [
@@ -72,6 +73,7 @@ const mockLocations = [
 ]
 
 export default function FeatureFlagsPage() {
+  useRequireSession()
   const { hasPermission } = useAppStore()
   const [selectedModule, setSelectedModule] = useState<string>('all')
   const [selectedScope, setSelectedScope] = useState<string>('all')
diff --git a/app/admin/users/page.tsx b/app/admin/users/page.tsx
index b54784c..8a5d9d9 100644
--- a/app/admin/users/page.tsx
+++ b/app/admin/users/page.tsx
@@ -10,6 +10,7 @@ import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Di
 import { Checkbox } from '@/components/ui/checkbox'
 import { Users, Shield, Settings, Plus } from 'lucide-react'
 import { useAppStore } from '@/lib/store'
+import { useRequireSession } from '@/lib/useRequireSession'
 
 // Mock data for demonstration
 const mockUsers = [
@@ -52,6 +53,7 @@ const mockPermissions = [
 ]
 
 export default function UsersPermissionsPage() {
+  useRequireSession()
   const { hasPermission } = useAppStore()
   const [selectedUser, setSelectedUser] = useState<string | null>(null)
   const [selectedLocation, setSelectedLocation] = useState<string>('all')
diff --git a/app/login/page.tsx b/app/login/page.tsx
new file mode 100644
index 0000000..1a75974
--- /dev/null
+++ b/app/login/page.tsx
@@ -0,0 +1,34 @@
+'use client';
+import { useState } from 'react';
+import { supabase } from '@/lib/supabase/client';
+
+export default function LoginPage() {
+  const [email, setEmail] = useState('');
+  const [password, setPassword] = useState('');
+  const [err, setErr] = useState<string|null>(null);
+  const [loading, setLoading] = useState(false);
+
+  const onSubmit = async (e: React.FormEvent) => {
+    e.preventDefault();
+    setErr(null); setLoading(true);
+    const { error } = await supabase.auth.signInWithPassword({ email, password });
+    setLoading(false);
+    if (error) { setErr(error.message); return; }
+    try { await fetch('/api/v1/admin/bootstrap', { method: 'POST' }); } catch {}
+    window.location.href = '/';
+  };
+
+  return (
+    <main className="mx-auto max-w-sm p-6">
+      <h1 className="text-xl mb-4">Accedi</h1>
+      <form onSubmit={onSubmit} className="flex flex-col gap-3">
+        <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="border p-2 rounded"/>
+        <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="border p-2 rounded"/>
+        {err && <p className="text-red-600 text-sm">{err}</p>}
+        <button type="submit" disabled={loading} className="bg-black text-white rounded px-3 py-2">
+          {loading ? 'Attendere…' : 'Entra'}
+        </button>
+      </form>
+    </main>
+  );
+}
diff --git a/app/page.tsx b/app/page.tsx
index dbcc22c..bb61685 100644
--- a/app/page.tsx
+++ b/app/page.tsx
@@ -6,8 +6,10 @@ import { Badge } from '@/components/ui/badge'
 import { Users, Shield, Flag, Database, Settings, Activity } from 'lucide-react'
 import Link from 'next/link'
 import { useAppStore } from '@/lib/store'
+import { useRequireSession } from '@/lib/useRequireSession'
 
 export default function HomePage() {
+  useRequireSession()
   const { context, hasPermission } = useAppStore()
 
   // Mock stats for demonstration
diff --git a/app/qa/whoami/page.tsx b/app/qa/whoami/page.tsx
new file mode 100644
index 0000000..e87b7b6
--- /dev/null
+++ b/app/qa/whoami/page.tsx
@@ -0,0 +1,16 @@
+'use client';
+import { useEffect, useState } from 'react';
+import { supabase } from '@/lib/supabase/client';
+
+export default function WhoAmI() {
+  const [state, setState] = useState<any>({});
+  useEffect(() => {
+    (async () => {
+      const { data: { user } } = await supabase.auth.getUser();
+      const { data: session } = await supabase.auth.getSession();
+      const { data: locs, error: lerr } = await supabase.from('locations').select('id,name,org_id').limit(5);
+      setState({ user, hasSession: !!session?.session, locsCount: locs?.length ?? 0, lerr: lerr?.message });
+    })();
+  }, []);
+  return <pre className="p-4 text-xs bg-gray-100 rounded">{JSON.stringify(state, null, 2)}</pre>;
+}
diff --git a/components/UserBadge.tsx b/components/UserBadge.tsx
new file mode 100644
index 0000000..2f331b4
--- /dev/null
+++ b/components/UserBadge.tsx
@@ -0,0 +1,18 @@
+'use client';
+import { useEffect, useState } from 'react';
+import { supabase } from '@/lib/supabase/client';
+import { hardLogout } from '@/lib/hardLogout';
+
+export function UserBadge() {
+  const [email, setEmail] = useState<string|null>(null);
+  useEffect(() => {
+    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
+  }, []);
+  if (!email) return <a href="/login" className="text-sm underline">Accedi</a>;
+  return (
+    <div className="flex items-center gap-3 text-sm">
+      <span>{email}</span>
+      <button onClick={hardLogout} className="px-2 py-1 rounded border">Logout</button>
+    </div>
+  );
+}
diff --git a/components/header.tsx b/components/header.tsx
index 7cd69c9..d390fa5 100644
--- a/components/header.tsx
+++ b/components/header.tsx
@@ -2,15 +2,6 @@
 
 import { Button } from '@/components/ui/button'
 import { Badge } from '@/components/ui/badge'
-import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
-import {
-  DropdownMenu,
-  DropdownMenuContent,
-  DropdownMenuItem,
-  DropdownMenuLabel,
-  DropdownMenuSeparator,
-  DropdownMenuTrigger,
-} from '@/components/ui/dropdown-menu'
 import {
   Select,
   SelectContent,
@@ -18,8 +9,9 @@ import {
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select'
-import { Bell, User, LogOut, Settings, MapPin, Building } from 'lucide-react'
+import { Bell, MapPin, Building } from 'lucide-react'
 import { useAppStore } from '@/lib/store'
+import { UserBadge } from '@/components/UserBadge'
 
 // Mock data for demonstration
 const mockOrgs = [
@@ -103,41 +95,7 @@ export function Header() {
             </Badge>
           </Button>
 
-          {/* User Menu */}
-          <DropdownMenu>
-            <DropdownMenuTrigger asChild>
-              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
-                <Avatar className="h-8 w-8">
-                  <AvatarImage src="/avatars/01.png" alt="User" />
-                  <AvatarFallback>DU</AvatarFallback>
-                </Avatar>
-              </Button>
-            </DropdownMenuTrigger>
-            <DropdownMenuContent className="w-56" align="end" forceMount>
-              <DropdownMenuLabel className="font-normal">
-                <div className="flex flex-col space-y-1">
-                  <p className="text-sm font-medium leading-none">Demo User</p>
-                  <p className="text-xs leading-none text-muted-foreground">
-                    demo@example.com
-                  </p>
-                </div>
-              </DropdownMenuLabel>
-              <DropdownMenuSeparator />
-              <DropdownMenuItem>
-                <User className="mr-2 h-4 w-4" />
-                <span>Profilo</span>
-              </DropdownMenuItem>
-              <DropdownMenuItem>
-                <Settings className="mr-2 h-4 w-4" />
-                <span>Impostazioni</span>
-              </DropdownMenuItem>
-              <DropdownMenuSeparator />
-              <DropdownMenuItem>
-                <LogOut className="mr-2 h-4 w-4" />
-                <span>Logout</span>
-              </DropdownMenuItem>
-            </DropdownMenuContent>
-          </DropdownMenu>
+          <UserBadge />
         </div>
       </div>
     </header>
diff --git a/lib/hardLogout.ts b/lib/hardLogout.ts
new file mode 100644
index 0000000..d56eb2a
--- /dev/null
+++ b/lib/hardLogout.ts
@@ -0,0 +1,9 @@
+import { supabase } from '@/lib/supabase/client';
+export async function hardLogout() {
+  try { await supabase.auth.signOut(); } catch {}
+  try {
+    localStorage.clear(); sessionStorage.clear();
+    if ('indexedDB' in window) { try { indexedDB.deleteDatabase('supabase-auth'); } catch {} }
+  } catch {}
+  window.location.href = '/login';
+}
diff --git a/lib/useRequireSession.ts b/lib/useRequireSession.ts
new file mode 100644
index 0000000..9a7b1b7
--- /dev/null
+++ b/lib/useRequireSession.ts
@@ -0,0 +1,12 @@
+'use client';
+import { useEffect } from 'react';
+import { supabase } from '@/lib/supabase/client';
+export function useRequireSession() {
+  useEffect(() => {
+    let mounted = true;
+    supabase.auth.getSession().then(({ data }) => {
+      if (mounted && !data.session) window.location.href = '/login';
+    });
+    return () => { mounted = false; };
+  }, []);
+}
diff --git a/tsconfig.json b/tsconfig.json
index d8b9323..1fe3e74 100644
--- a/tsconfig.json
+++ b/tsconfig.json
@@ -18,6 +18,7 @@
         "name": "next"
       }
     ],
+    "baseUrl": ".",
     "paths": {
       "@/*": ["./*"]
     }

```

## Secret Check
Nessun secret sensibile è stato aggiunto al bundle. Il client Supabase usa solo chiavi pubbliche e variabili d'ambiente già esistenti.

## Istruzioni per test manuale
1. Visita `/login`, effettua il login con email/password reali: verrai reindirizzato a `/`.
2. L'header mostra la tua email; usando **Logout** torni su `/login`.
3. Apri `/qa/whoami` e verifica che `hasSession=true`.
4. Seleziona Demo → Lyon dal selettore nel header: la UI viene popolata.
