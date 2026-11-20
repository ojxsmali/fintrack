// Verifies the migration and Row Level Security against real Postgres (PGlite, in-process).
// Supabase's `auth` schema is stubbed minimally: auth.users + auth.uid() reading the JWT `sub`
// claim the same way Supabase does. Run:  node supabase/tests/rls-check.mjs  (needs @electric-sql/pglite)
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const migration = ['20261120000000_init.sql', '20261121000000_signup_currency.sql']
  .map((f) => readFileSync(path.join(here, '../migrations', f), 'utf8'))
  .join(';\n')
const db = new PGlite()

let failures = 0
const ok = (cond, label) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`)
  if (!cond) failures++
}
async function expectError(sql, params, label, pattern) {
  try {
    await db.query(sql, params)
    ok(false, `${label} (expected an error, query succeeded)`)
  } catch (e) {
    ok(!pattern || pattern.test(e.message), `${label} → ${e.message.split('\n')[0]}`)
  }
}

await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated;
`)
// Worst case for us: projects created with "Grant API access to new tables automatically"
// ON give anon full default privileges. Simulate that when RLS_CHECK_AUTO_GRANT=1; the
// default run mirrors the box unchecked, so the migration's own grants must suffice.
if (process.env.RLS_CHECK_AUTO_GRANT === '1') {
  await db.exec(`
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on functions to anon, authenticated;
  `)
}
await db.exec(migration)
ok(true, 'migration applied cleanly')

const A = '11111111-1111-1111-1111-111111111111'
const B = '22222222-2222-2222-2222-222222222222'
await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1,'a@x.test','{"display_name":"Ojas"}'), ($2,'b@x.test','{"currency":"usd"}')`, [A, B])

const r = await db.query(`select (select count(*) from public.categories where user_id=$1)::int c, (select display_name from public.profiles where id=$1) n, (select count(*) from public.accounts where user_id=$1)::int a`, [A])
ok(r.rows[0].c === 16 && r.rows[0].n === 'Ojas' && r.rows[0].a === 1, 'signup trigger seeds profile, 1 account, 16 categories')
const cur = await db.query(`select (select currency from public.profiles where id=$1) a, (select currency from public.profiles where id=$2) b`, [A, B])
ok(cur.rows[0].a === 'INR' && cur.rows[0].b === 'USD', 'signup currency: defaults to INR, honours a chosen ISO code')

async function as(uid) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false); set role ${uid ? 'authenticated' : 'anon'};`)
}
const one = async (sql, p) => (await db.query(sql, p)).rows[0]

// Grab ids as superuser
await db.exec('reset role')
const ids = async (u) => ({
  acc: (await one(`select id from public.accounts where user_id=$1`, [u])).id,
  food: (await one(`select id from public.categories where user_id=$1 and name='Food'`, [u])).id,
  salary: (await one(`select id from public.categories where user_id=$1 and name='Salary'`, [u])).id,
})
const a = await ids(A)
const b = await ids(B)

// ── user B writes some data
await as(B)
await db.query(`insert into public.transactions (account_id, category_id, type, amount, merchant, occurred_on) values ($1,$2,'expense',999,'B secret','2026-11-01')`, [b.acc, b.food])

// ── user A
await as(A)
await db.query(`insert into public.transactions (account_id, category_id, type, amount, merchant, occurred_on) values ($1,$2,'income',42000,'Employer','2026-11-01')`, [a.acc, a.salary])
await db.query(`insert into public.transactions (account_id, category_id, type, amount, merchant, occurred_on) values ($1,$2,'expense',649,'Netflix','2026-11-05')`, [a.acc, a.food])
const mine = await db.query(`select merchant, user_id from public.transactions`)
ok(mine.rows.length === 2 && mine.rows.every((x) => x.user_id === A), 'A sees only their own 2 transactions (B’s row hidden)')
ok(mine.rows.every((x) => x.user_id === A), 'user_id defaulted from auth.uid(), not the client')

const bal = await db.query(`select balance from public.account_balances`)
ok(bal.rows.length === 1 && Number(bal.rows[0].balance) === 41351, 'account_balances view is RLS-scoped and correct (0 + 42000 − 649)')
const ms = await db.query(`select income, expense from public.monthly_summaries`)
ok(ms.rows.length === 1 && Number(ms.rows[0].expense) === 649, 'monthly_summaries view is RLS-scoped')

await expectError(`insert into public.transactions (user_id, account_id, category_id, type, amount, merchant, occurred_on) values ($1,$2,$3,'expense',1,'spoof','2026-11-01')`, [B, b.acc, b.food], 'A cannot insert rows as B', /row-level security/)
await expectError(`insert into public.transactions (account_id, category_id, type, amount, merchant, occurred_on) values ($1,$2,'expense',1,'x','2026-11-01')`, [a.acc, b.food], 'A cannot attach B’s category', /foreign key/)
await expectError(`insert into public.transactions (account_id, category_id, type, amount, merchant, occurred_on) values ($1,$2,'expense',1,'x','2026-11-01')`, [b.acc, a.food], 'A cannot attach B’s account', /foreign key/)
await expectError(`insert into public.transactions (account_id, category_id, type, amount, merchant, occurred_on) values ($1,$2,'expense',1,'x','2026-11-01')`, [a.acc, a.salary], 'expense under an income category is rejected', /foreign key/)
await expectError(`insert into public.transactions (account_id, category_id, type, amount, merchant, occurred_on) values ($1,$2,'expense',-5,'x','2026-11-01')`, [a.acc, a.food], 'negative amount is rejected', /check constraint/)
await expectError(`insert into public.budgets (category_id, monthly_limit) values ($1, 100)`, [a.salary], 'budget on income category is rejected', /foreign key/)
await db.query(`insert into public.budgets (category_id, monthly_limit) values ($1, 8000)`, [a.food])
await expectError(`insert into public.budgets (category_id, monthly_limit) values ($1, 5000)`, [a.food], 'one budget per category', /unique/)

const upd = await db.query(`update public.transactions set amount = 1 where merchant = 'B secret'`)
ok(upd.affectedRows === 0, 'A cannot update B’s transaction (0 rows)')
const del = await db.query(`delete from public.transactions where merchant = 'B secret'`)
ok(del.affectedRows === 0, 'A cannot delete B’s transaction (0 rows)')
await expectError(`update public.transactions set user_id = $1 where merchant = 'Netflix'`, [B], 'A cannot hand a row to B', /row-level security|foreign key/)
const prof = await db.query(`select id from public.profiles`)
ok(prof.rows.length === 1 && prof.rows[0].id === A, 'A sees only their own profile')

// ── anonymous
await as(null)
await expectError(`select * from public.transactions`, [], 'anon has no access to transactions', /permission denied/)

// ── B still has their row
await as(B)
const bRows = await db.query(`select merchant from public.transactions`)
ok(bRows.rows.length === 1 && bRows.rows[0].merchant === 'B secret', 'B’s data intact and private')

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll RLS / constraint checks passed')
process.exit(failures ? 1 : 0)
