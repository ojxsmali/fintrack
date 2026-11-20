-- FinTrack — let new accounts choose their currency at sign-up.
-- Reads raw_user_meta_data->>'currency' (sent by the sign-up form) and falls back
-- to INR if it is missing or not a 3-letter ISO code.

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  chosen text := upper(coalesce(new.raw_user_meta_data ->> 'currency', ''));
begin
  insert into public.profiles (id, display_name, currency)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 60),
    case when chosen ~ '^[A-Z]{3}$' then chosen else 'INR' end
  );

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

revoke execute on function public.handle_new_user() from public, anon, authenticated;
