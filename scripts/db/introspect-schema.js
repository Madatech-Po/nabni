#!/usr/bin/env node
/**
 * Dumps the live Supabase Postgres schema (tables, columns, foreign keys, enums,
 * check constraints, RLS policies, RLS enabled/disabled state, triggers).
 *
 * The repo's supabase/migrations/*.sql files are not guaranteed to reflect what's
 * actually deployed (this project has drifted from them before). Run this against
 * the real database whenever you need ground truth instead of trusting the migration
 * files, e.g. before writing a new migration.
 *
 * Usage:
 *   SUPABASE_DB_URL="postgresql://postgres.<ref>:<password>@<pooler-host>:5432/postgres" \
 *     node scripts/db/introspect-schema.js [--schema public] [--out file.json]
 *
 * Get the connection string from Supabase Dashboard -> Project Settings -> Database
 * -> Connection string -> "Session pooler" (the direct db.<ref>.supabase.co host is
 * IPv6-only and will fail to resolve on IPv4-only networks).
 *
 * TLS certificates are always verified. Supabase signs its certs with its own root CA,
 * so download it from Dashboard -> Project Settings -> Database -> SSL Configuration
 * and point SUPABASE_DB_CA_CERT at the file:
 *   SUPABASE_DB_CA_CERT=./prod-ca-2021.crt SUPABASE_DB_URL=... node scripts/db/introspect-schema.js
 *
 * Never commit a connection string. Pass it via env var only.
 */

const { Client } = require('pg');

function parseArgs(argv) {
  const args = { schema: 'public', out: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--schema') args.schema = argv[++i];
    else if (argv[i] === '--out') args.out = argv[++i];
  }
  return args;
}

function buildQueries(schema) {
  return {
    columns: `
      select table_name, column_name, data_type, udt_name, is_nullable, column_default
      from information_schema.columns
      where table_schema = $1
      order by table_name, ordinal_position;
    `,
    foreign_keys: `
      select tc.table_name, kcu.column_name,
             ccu.table_name as references_table, ccu.column_name as references_column
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
      join information_schema.constraint_column_usage ccu
        on tc.constraint_name = ccu.constraint_name and tc.table_schema = ccu.table_schema
      where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = $1
      order by tc.table_name, kcu.column_name;
    `,
    enums: `
      select t.typname, e.enumlabel, e.enumsortorder
      from pg_type t
      join pg_enum e on t.oid = e.enumtypid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = $1
      order by t.typname, e.enumsortorder;
    `,
    check_constraints: `
      select tc.table_name, cc.constraint_name, cc.check_clause
      from information_schema.check_constraints cc
      join information_schema.table_constraints tc
        on tc.constraint_name = cc.constraint_name and tc.table_schema = cc.constraint_schema
      where tc.table_schema = $1 and tc.constraint_type = 'CHECK'
        and cc.constraint_name not like '%_not_null'
      order by tc.table_name;
    `,
    policies: `
      select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      from pg_policies
      where schemaname = $1
      order by tablename, policyname;
    `,
    rls_enabled: `
      select relname as table_name, relrowsecurity as rls_enabled
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = $1 and relkind = 'r'
      order by relname;
    `,
    triggers: `
      select event_object_table, trigger_name, action_timing, event_manipulation, action_statement
      from information_schema.triggers
      where trigger_schema = $1
      order by event_object_table;
    `,
    auth_users_triggers: `
      select trigger_name, action_timing, event_manipulation, action_statement
      from information_schema.triggers
      where event_object_schema = 'auth' and event_object_table = 'users';
    `,
  };
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('Missing SUPABASE_DB_URL (or DATABASE_URL) env var. See the usage comment at the top of this script.');
    process.exit(1);
  }

  const caPath = process.env.SUPABASE_DB_CA_CERT;
  const ssl = caPath ? { ca: require('fs').readFileSync(caPath, 'utf8') } : true;
  const client = new Client({ connectionString, ssl });
  await client.connect();

  const queries = buildQueries(args.schema);
  const results = {};
  for (const [name, sql] of Object.entries(queries)) {
    try {
      const params = sql.includes('$1') ? [args.schema] : [];
      results[name] = (await client.query(sql, params)).rows;
    } catch (err) {
      results[name] = { error: err.message };
    }
  }

  await client.end();

  const output = JSON.stringify(results, null, 2);
  if (args.out) {
    require('fs').writeFileSync(args.out, output);
    console.log(`Schema snapshot written to ${args.out}`);
  } else {
    console.log(output);
  }
})().catch((err) => {
  console.error('Introspection failed:', err.message);
  process.exit(1);
});
