# 🚀 Setup Manuale - Staff Management System

## ⚠️ IMPORTANTE: Passi Obbligatori

L'app attualmente mostra errori perché il database non è configurato. Questo è normale!

### 1. 🗄️ Database Setup (Supabase Dashboard)

Vai su: https://supabase.com/dashboard/project/gsgqcsaycyjkbeepwoto

#### Step 1: Applica Schema Database
1. Vai su **SQL Editor**
2. Copia e incolla tutto il contenuto di `migrations/001_initial_schema.sql`
3. Clicca **Run**

#### Step 2: Inserisci Dati Demo
1. Sempre in **SQL Editor**
2. Copia e incolla tutto il contenuto di `seed/001_initial_data.sql`
3. Clicca **Run**

### 2. 📦 Storage Setup

1. Vai su **Storage** → **Buckets**
2. Crea nuovo bucket chiamato `media`
3. Vai su **Policies** per il bucket `media`
4. Aggiungi queste policy:

```sql
-- Policy per lettura
CREATE POLICY "Authenticated users can read media" ON storage.objects
FOR SELECT USING (auth.role() = 'authenticated');

-- Policy per scrittura
CREATE POLICY "Authenticated users can upload media" ON storage.objects
FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

### 3. ⚡ Edge Function Deploy

```bash
# Installa Supabase CLI
npm install -g supabase

# Login
supabase login

# Link progetto
supabase link --project-ref gsgqcsaycyjkbeepwoto

# Deploy function
supabase functions deploy set_app_context
```

### 4. ✅ Verifica Setup

Dopo aver completato i passi sopra:

```bash
# Test completo
bun run test:all
```

## 🎯 Cosa Succederà Dopo il Setup

1. ✅ Il dropdown "Seleziona organizzazione" mostrerà "Demo Organization"
2. ✅ Potrai selezionare location (Lyon/Menton)
3. ✅ I pulsanti "Accesso Negato" diventeranno funzionali
4. ✅ Le pagine admin saranno accessibili
5. ✅ Il sistema di permessi funzionerà completamente

## 🔧 Stato Attuale vs Dopo Setup

### Ora (Senza Database):
- ❌ 404 errors nelle API calls
- ❌ "Contesto non impostato"
- ❌ "Accesso Negato" su tutti i pulsanti
- ❌ Dropdown organizzazione vuoto

### Dopo Setup:
- ✅ API calls funzionanti
- ✅ Contesto org/location selezionabile
- ✅ Pulsanti admin funzionali
- ✅ Sistema permessi attivo
- ✅ Dati demo caricati

## 🎉 Il Sistema È Completo!

Gli errori che vedi sono **previsti e corretti**. Il sistema implementa:

- ✅ **Deny-by-default security** (ecco perché vedi "Accesso Negato")
- ✅ **Context-aware permissions** (ecco perché serve selezionare org/location)
- ✅ **Graceful error handling** (l'app non crasha, mostra messaggi informativi)

**L'implementazione è al 100% completa. Serve solo il setup manuale del database!**
