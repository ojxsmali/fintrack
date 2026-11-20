-- FinTrack — initial schema
-- Every user-owned table carries user_id, defaults it to auth.uid(), and is
-- protected by Row Level Security. Composite foreign keys make it impossible
-- (at the database level) to attach a transaction to another user's category
-- or account, or to file an expense under an income category.

create type public.tx_type as enum ('income', 'expense');
create type public.account_kind as enum ('bank', 'card', 'cash', 'wallet');

-- ───────────────────────────── profiles ─────────────────────────────
create table public.profiles (
  id                      uuid primary key references auth.users (id) on delete cascade,
  display_name            text not null default '' check (char_length(display_name) <= 60),
  currency                char(3) not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  show_budget_warnings    boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ───────────────────────────── accounts ─────────────────────────────
create table public.accounts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 40),
  kind              public.account_kind not null default 'bank',
  starting_balance  numeric(14, 2) not null default 0,
  created_at        timestamptz not null default now(),
  unique (id, user_id)
);
create index accounts_user_idx on public.accounts (user_id);

-- ──────────────────────────── categories ────────────────────────────
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 32),
  kind        public.tx_type not null,
  created_at  timestamptz not null default now(),
  unique (id, user_id, kind)
);
create unique index categories_user_name_kind_uq on public.categories (user_id, lower(name), kind);

-- ─────────────────────────── transactions ───────────────────────────
create table public.transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id   uuid not null,
  category_id  uuid not null,
  type         public.tx_type not null,
  amount       numeric(14, 2) not null check (amount > 0 and amount < 1000000000),
  merchant     text not null check (char_length(merchant) between 1 and 80),
  description  text not null default '' check (char_length(description) <= 140),
  notes        text not null default '' check (char_length(notes) <= 1000),
  occurred_on  date not null check (occurred_on between date '2000-01-01' and date '2100-01-01'),
  is_sample    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- same-user + matching-kind guarantees
  foreign key (account_id, user_id) references public.accounts (id, user_id) on delete restrict,
  foreign key (category_id, user_id, type) references public.categories (id, user_id, kind) on delete restrict
);
create index transactions_user_date_idx on public.transactions (user_id, occurred_on desc, created_at desc);
create index transactions_user_category_idx on public.transactions (user_id, category_id, occurred_on);

-- ───────────────────────────── budgets ──────────────────────────────
create table public.budgets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id    uuid not null,
  kind           public.tx_type not null default 'expense' check (kind = 'expense'),
  monthly_limit  numeric(14, 2) not null check (monthly_limit > 0 and monthly_limit < 1000000000),
  is_sample      boolean not null default false,
  created_at     timestamptz not null default now(),
  unique (user_id, category_id),
  foreign key (category_id, user_id, kind) references public.categories (id, user_id, kind) on delete cascade
);

-- ─────────────────────── updated_at maintenance ─────────────────────
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger transactions_touch before update on public.transactions
  for each row execute function public.touch_updated_at();

-- ───────────────────────── Row Level Security ───────────────────────
alter table public.profiles     enable row level security;
alter table public.accounts     enable row level security;
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets      enable row level security;

create policy "own profile: read"   on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "own profile: update" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['accounts', 'categories', 'transactions', 'budgets'] loop
    execute format('create policy "own rows: read"   on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create policy "own rows: insert" on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format('create policy "own rows: update" on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('create policy "own rows: delete" on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- Explicit grants: signed-in users may use these tables (RLS then limits them to
-- their own rows). Don't rely on the project's "auto-grant new tables" setting.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.accounts, public.categories, public.transactions, public.budgets to authenticated;
grant select, update on public.profiles to authenticated;

-- Anonymous visitors get nothing.
revoke all on public.profiles, public.accounts, public.categories, public.transactions, public.budgets from anon;

-- ─────────────────────────── derived views ──────────────────────────
-- security_invoker makes the views run with the caller's RLS, so they can
-- never leak rows across users.
create view public.account_balances with (security_invoker = true) as
select
  a.id as account_id,
  a.user_id,
  a.name,
  a.kind,
  a.starting_balance,
  coalesce(sum(t.amount) filter (where t.type = 'income'), 0)  as income,
  coalesce(sum(t.amount) filter (where t.type = 'expense'), 0) as expense,
  a.starting_balance
    + coalesce(sum(t.amount) filter (where t.type = 'income'), 0)
    - coalesce(sum(t.amount) filter (where t.type = 'expense'), 0) as balance
from public.accounts a
left join public.transactions t on t.account_id = a.id
group by a.id;

create view public.monthly_summaries with (security_invoker = true) as
select
  user_id,
  date_trunc('month', occurred_on)::date as month,
  coalesce(sum(amount) filter (where type = 'income'), 0)  as income,
  coalesce(sum(amount) filter (where type = 'expense'), 0) as expense,
  count(*) as transaction_count
from public.transactions
group by user_id, date_trunc('month', occurred_on);

grant select on public.account_balances, public.monthly_summaries to authenticated;
revoke all on public.account_balances, public.monthly_summaries from anon;

-- ─────────────────────── new-user bootstrap ─────────────────────────
-- Runs as definer so it can write rows for the brand-new user; it only ever
-- writes rows owned by NEW.id.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 60));

  insert into public.accounts (user_id, name, kind) values (new.id, 'Main account', 'bank');

  insert into public.categories (user_id, name, kind)
  select new.id, c.name, c.kind::public.tx_type
  from (values
    ('Housing', 'expense'), ('Food', 'expense'), ('Groceries', 'expense'), ('Transport', 'expense'),
    ('Shopping', 'expense'), ('Entertainment', 'expense'), ('Health', 'expense'), ('Education', 'expense'),
    ('Bills', 'expense'), ('Subscriptions', 'expense'), ('Travel', 'expense'), ('Other', 'expense'),
    ('Salary', 'income'), ('Freelance', 'income'), ('Interest', 'income'), ('Other income', 'income')
  ) as c(name, kind);

  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;
