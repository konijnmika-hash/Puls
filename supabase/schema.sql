-- Puls: accounts, abonnementen, vriendencodes en het beheeroverzicht.
-- Plak dit in Supabase -> SQL Editor -> New query, en klik op Run. Je kunt het veilig opnieuw draaien.
-- Zet daarna onderaan JOUW e-mailadres in de tabel admins.

create extension if not exists pgcrypto;

-- ---------- Tabellen ----------

-- Elk account: wanneer het begon en tot wanneer de proefperiode loopt
create table if not exists public.accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  trial_ends timestamptz not null default now() + interval '14 days'
);

-- Abonnementen. plan: 'maand', 'jaar' of 'vriend' (gratis voor altijd via een code)
create table if not exists public.subscriptions (
  user_id uuid primary key references public.accounts (id) on delete cascade,
  plan text not null check (plan in ('maand', 'jaar', 'vriend')),
  since timestamptz not null default now(),
  until timestamptz not null,
  renews boolean not null default true,
  code text
);

-- Elke betaling (ook verlengingen), voor de omzet en "hoeveel mensen kopen het"
create table if not exists public.purchases (
  id bigint generated always as identity primary key,
  user_id uuid references public.accounts (id) on delete set null,
  plan text not null check (plan in ('maand', 'jaar')),
  amount numeric(8, 2) not null,
  created_at timestamptz not null default now()
);

-- Vriendencodes: één keer te gebruiken, daarna voor altijd gratis
create table if not exists public.codes (
  code text primary key,
  note text not null default '',
  created_at timestamptz not null default now(),
  active boolean not null default true,
  redeemed_by uuid references public.accounts (id) on delete set null,
  redeemed_email text,
  redeemed_at timestamptz
);

-- Wie het beheeroverzicht mag zien
create table if not exists public.admins (email text primary key);

-- ---------- Hulpfuncties ----------

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

-- Nieuw account in auth -> regel in accounts
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.accounts (id, email) values (new.id, lower(new.email)) on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- Beveiliging: iedereen ziet alleen zichzelf, de beheerder alles ----------

alter table public.accounts enable row level security;
alter table public.subscriptions enable row level security;
alter table public.purchases enable row level security;
alter table public.codes enable row level security;
alter table public.admins enable row level security;

drop policy if exists "eigen account" on public.accounts;
create policy "eigen account" on public.accounts for select using (id = auth.uid() or public.is_admin());
drop policy if exists "eigen abonnement" on public.subscriptions;
create policy "eigen abonnement" on public.subscriptions for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "eigen aankopen" on public.purchases;
create policy "eigen aankopen" on public.purchases for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "beheer codes" on public.codes;
create policy "beheer codes" on public.codes for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "beheer admins" on public.admins;
create policy "beheer admins" on public.admins for select using (public.is_admin());

-- ---------- Acties vanuit de app ----------

-- Code inwisselen: werkt één keer, geeft een abonnement dat nooit afloopt
create or replace function public.redeem_code(p_code text) returns public.subscriptions
language plpgsql security definer set search_path = public as $$
declare
  c public.codes;
  s public.subscriptions;
begin
  if auth.uid() is null then raise exception 'Log eerst in.'; end if;
  select * into c from public.codes where code = upper(trim(p_code)) for update;
  if not found or not c.active then raise exception 'Deze code bestaat niet.'; end if;
  if c.redeemed_by is not null and c.redeemed_by <> auth.uid() then raise exception 'Deze code is al gebruikt.'; end if;
  update public.codes set redeemed_by = auth.uid(), redeemed_email = auth.jwt() ->> 'email', redeemed_at = coalesce(redeemed_at, now()) where code = c.code;
  insert into public.subscriptions (user_id, plan, since, until, renews, code)
    values (auth.uid(), 'vriend', now(), '9999-12-31', false, c.code)
    on conflict (user_id) do update set plan = 'vriend', until = '9999-12-31', renews = false, code = c.code
    returning * into s;
  return s;
end;
$$;

-- DEMO-betaling: zet het abonnement direct aan en boekt de aankoop.
-- Vervang dit door een webhook van je betaalprovider (Mollie/Stripe) zodra je echt laat betalen,
-- en haal dan de execute-rechten hieronder weg.
create or replace function public.demo_checkout(p_plan text) returns public.subscriptions
language plpgsql security definer set search_path = public as $$
declare
  a public.accounts;
  cur public.subscriptions;
  s public.subscriptions;
  start timestamptz;
  price numeric := case p_plan when 'maand' then 2.99 when 'jaar' then 30 end;
begin
  if auth.uid() is null then raise exception 'Log eerst in.'; end if;
  if price is null then raise exception 'Onbekend abonnement.'; end if;
  select * into a from public.accounts where id = auth.uid();
  select * into cur from public.subscriptions where user_id = auth.uid();
  if cur.plan = 'vriend' then return cur; end if;
  start := greatest(now(), coalesce(cur.until, now()), a.trial_ends);
  insert into public.subscriptions (user_id, plan, since, until, renews)
    values (auth.uid(), p_plan, now(), start + (case p_plan when 'maand' then interval '1 month' else interval '1 year' end), true)
    on conflict (user_id) do update set plan = excluded.plan, until = excluded.until, renews = true,
      since = case when public.subscriptions.until > now() then public.subscriptions.since else now() end
    returning * into s;
  insert into public.purchases (user_id, plan, amount) values (auth.uid(), p_plan, price);
  return s;
end;
$$;

-- Opzeggen: je houdt toegang tot het einde van je periode
create or replace function public.cancel_subscription() returns public.subscriptions
language sql security definer set search_path = public as $$
  update public.subscriptions set renews = false where user_id = auth.uid() and plan <> 'vriend' returning *;
$$;

-- ---------- Cijfers voor het beheeroverzicht ----------

create or replace function public.admin_stats() returns json
language plpgsql stable security definer set search_path = public as $$
declare r json;
begin
  if not public.is_admin() then raise exception 'Geen toegang.'; end if;
  select json_build_object(
    'accounts', (select count(*) from accounts),
    'inTrial', (select count(*) from accounts a where a.trial_ends > now()
                 and not exists (select 1 from subscriptions s where s.user_id = a.id and s.until > now())),
    'monthly', (select count(*) from subscriptions where plan = 'maand' and until > now()),
    'yearly', (select count(*) from subscriptions where plan = 'jaar' and until > now()),
    'friends', (select count(*) from subscriptions where plan = 'vriend'),
    'cancelled', (select count(*) from subscriptions where plan <> 'vriend' and until > now() and not renews),
    'expired', (select count(*) from accounts a where a.trial_ends <= now()
                 and not exists (select 1 from subscriptions s where s.user_id = a.id and s.until > now())),
    'buyers', (select count(distinct user_id) from purchases),
    'purchases', (select count(*) from purchases),
    'revenue', (select coalesce(sum(amount), 0) from purchases),
    'revenue30', (select coalesce(sum(amount), 0) from purchases where created_at > now() - interval '30 days'),
    'weeks', (select coalesce(json_agg(w order by w.week), '[]'::json) from (
        select to_char(date_trunc('week', created_at), 'YYYY-MM-DD') as week,
               count(*) filter (where plan = 'maand') as maand,
               count(*) filter (where plan = 'jaar') as jaar,
               sum(amount) as amount
        from purchases where created_at > now() - interval '12 weeks' group by 1) w),
    'signups', (select coalesce(json_agg(w order by w.week), '[]'::json) from (
        select to_char(date_trunc('week', created_at), 'YYYY-MM-DD') as week, count(*) as n
        from accounts where created_at > now() - interval '12 weeks' group by 1) w),
    'recent', (select coalesce(json_agg(p), '[]'::json) from (
        select pu.created_at, pu.plan, pu.amount, ac.email from purchases pu left join accounts ac on ac.id = pu.user_id
        order by pu.created_at desc limit 25) p)
  ) into r;
  return r;
end;
$$;

revoke all on function public.admin_stats() from anon;
grant execute on function public.redeem_code(text), public.demo_checkout(text), public.cancel_subscription(), public.admin_stats(), public.is_admin() to authenticated;

-- ---------- Jij als beheerder ----------
-- Vervang het voorbeeldadres door het e-mailadres waarmee jij in Puls een account maakt:
-- insert into public.admins (email) values ('jouw@email.nl') on conflict do nothing;
