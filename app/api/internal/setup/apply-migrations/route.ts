import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const token = req.headers.get('x-setup-token');
    if (token !== process.env.APP_SETUP_TOKEN) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    if (process.env.APP_SETUP_LOCKED === 'true') {
      return NextResponse.json({ ok: false, error: 'locked' }, { status: 423 });
    }

    const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
    if (!dbUrl) {
      return NextResponse.json({ ok: false, error: 'db_not_configured' }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const seedRequested = searchParams.get('seed') === 'true';

    const migrationsDir = path.join(process.cwd(), 'db', 'migrations');
    const seedsDir = path.join(process.cwd(), 'db', 'seeds');

    const migrationFiles = (await fs.readdir(migrationsDir)).filter(f => f.endsWith('.sql')).sort();
    const seedFiles = seedRequested
      ? (await fs.readdir(seedsDir)).filter(f => f.endsWith('.sql')).sort()
      : [];

    const totalFiles = migrationFiles.length + seedFiles.length;
    if (totalFiles === 0) {
      return NextResponse.json({ ok: false, error: 'nothing_to_migrate' }, { status: 409 });
    }

    const { Client } = await import('pg');
    const client = new Client({ connectionString: dbUrl });
    await client.connect();

    try {
      await client.query(`create table if not exists schema_migrations(
        version text primary key,
        applied_at timestamptz not null default now()
      );`);

      const applied: string[] = [];
      let migrated = 0;
      let seeded = 0;

      for (const file of migrationFiles) {
        const version = file;
        const exists = await client.query('select 1 from schema_migrations where version = $1', [version]);
        if (exists.rowCount > 0) continue;
        const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
        try {
          await client.query('BEGIN');
          await client.query(sql);
          await client.query('insert into schema_migrations(version) values ($1)', [version]);
          await client.query('COMMIT');
          migrated++;
          applied.push(version);
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        }
      }

      for (const file of seedFiles) {
        const version = `seed:${file}`;
        const exists = await client.query('select 1 from schema_migrations where version = $1', [version]);
        if (exists.rowCount > 0) continue;
        const sql = await fs.readFile(path.join(seedsDir, file), 'utf8');
        try {
          await client.query('BEGIN');
          await client.query(sql);
          await client.query('insert into schema_migrations(version) values ($1)', [version]);
          await client.query('COMMIT');
          seeded++;
          applied.push(version);
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        }
      }

      if (migrated === 0 && seeded === 0) {
        return NextResponse.json({ ok: false, error: 'nothing_to_migrate' }, { status: 409 });
      }

      const body: Record<string, any> = { ok: true, migrated, versions: applied };
      if (seedRequested) body.seeded = seeded;
      return NextResponse.json(body);
    } finally {
      await client.end();
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: 'migration_failed', detail }, { status: 500 });
  }
}

