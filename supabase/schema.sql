-- =====================================================================
-- Presupuesto Familiar · esquema de base de datos para Supabase
-- Cómo usarlo: Supabase → SQL Editor → New query → pega TODO este
-- archivo → Run. Solo hace falta ejecutarlo una vez.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Tablas ----------------------------------------------------

create table if not exists public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Nuestro hogar',
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  created_by  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  role         text not null default 'editor' check (role in ('admin', 'editor')),
  joined_at    timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists public.categories (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  grp          text not null check (grp in ('ingresos', 'fijos', 'variables', 'deudas', 'ahorro')),
  name         text not null,
  goal_amount  numeric(12, 2),            -- meta de ahorro o saldo inicial de una deuda
  sort         int not null default 0,
  archived     boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.budgets (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  category_id  uuid not null references public.categories(id) on delete cascade,
  month        date not null,              -- siempre el día 1 del mes
  amount       numeric(12, 2) not null default 0,
  unique (category_id, month)
);

create table if not exists public.transactions (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  category_id  uuid not null references public.categories(id) on delete restrict,
  amount       numeric(12, 2) not null check (amount > 0),
  date         date not null default current_date,
  note         text,
  paid_by      uuid references auth.users(id) on delete set null,  -- null = compartido
  created_by   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now()
);

create index if not exists transactions_hh_date on public.transactions (household_id, date);
create index if not exists budgets_hh_month on public.budgets (household_id, month);

-- ---------- Seguridad: cada uno solo ve los datos de su hogar ---------

create or replace function public.is_member(hid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where household_id = hid and user_id = auth.uid());
$$;

alter table public.households   enable row level security;
alter table public.members      enable row level security;
alter table public.categories   enable row level security;
alter table public.budgets      enable row level security;
alter table public.transactions enable row level security;

drop policy if exists hh_select on public.households;
create policy hh_select on public.households for select using (public.is_member(id));
drop policy if exists hh_update on public.households;
create policy hh_update on public.households for update using (public.is_member(id));

drop policy if exists mem_select on public.members;
create policy mem_select on public.members for select using (public.is_member(household_id));
drop policy if exists mem_update_self on public.members;
create policy mem_update_self on public.members for update using (user_id = auth.uid());

drop policy if exists cat_all on public.categories;
create policy cat_all on public.categories for all
  using (public.is_member(household_id)) with check (public.is_member(household_id));

drop policy if exists bud_all on public.budgets;
create policy bud_all on public.budgets for all
  using (public.is_member(household_id)) with check (public.is_member(household_id));

drop policy if exists tx_all on public.transactions;
create policy tx_all on public.transactions for all
  using (public.is_member(household_id)) with check (public.is_member(household_id));

-- ---------- Total acumulado por categoría (metas de ahorro y deudas) --

create or replace view public.category_totals with (security_invoker = true) as
  select category_id, household_id, sum(amount)::numeric(12, 2) as total
  from public.transactions
  group by category_id, household_id;

-- ---------- Crear un hogar (con categorías por defecto) ---------------

create or replace function public.create_household(p_name text, p_display_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  hid uuid;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;

  insert into households (name, created_by) values (coalesce(nullif(trim(p_name), ''), 'Nuestro hogar'), auth.uid())
  returning id into hid;

  insert into members (household_id, user_id, display_name, role)
  values (hid, auth.uid(), p_display_name, 'admin');

  insert into categories (household_id, grp, name, sort, goal_amount) values
    (hid, 'ingresos',  'Nómina ' || p_display_name, 1, null),
    (hid, 'ingresos',  'Nómina pareja',           2, null),
    (hid, 'ingresos',  'Extras / freelance',      3, null),
    (hid, 'fijos',     'Alquiler / hipoteca',     1, null),
    (hid, 'fijos',     'Suministros',             2, null),
    (hid, 'fijos',     'Internet y móvil',        3, null),
    (hid, 'fijos',     'Seguros',                 4, null),
    (hid, 'fijos',     'Colegio / guardería',     5, null),
    (hid, 'variables', 'Supermercado',            1, null),
    (hid, 'variables', 'Restaurantes',            2, null),
    (hid, 'variables', 'Transporte',              3, null),
    (hid, 'variables', 'Ocio',                    4, null),
    (hid, 'variables', 'Ropa',                    5, null),
    (hid, 'deudas',    'Préstamo coche',          1, null),
    (hid, 'deudas',    'Tarjeta de crédito',      2, null),
    (hid, 'deudas',    'Préstamo personal',       3, null),
    (hid, 'ahorro',    'Fondo de emergencia',     1, null),
    (hid, 'ahorro',    'Viajes',                  2, null),
    (hid, 'ahorro',    'Otros objetivos',         3, null);

  return hid;
end;
$$;

-- ---------- Unirse a un hogar con el código de invitación -------------

create or replace function public.join_household(p_code text, p_display_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  hid uuid;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;

  select id into hid from households where invite_code = upper(trim(p_code));
  if hid is null then raise exception 'Código de invitación no válido'; end if;

  insert into members (household_id, user_id, display_name, role)
  values (hid, auth.uid(), p_display_name, 'editor')
  on conflict (household_id, user_id) do nothing;

  return hid;
end;
$$;

grant execute on function public.create_household(text, text) to authenticated;
grant execute on function public.join_household(text, text)   to authenticated;
grant execute on function public.is_member(uuid)               to authenticated;

-- ---------- Tiempo real: ver al instante lo que carga el otro ----------

do $$
begin
  begin alter publication supabase_realtime add table public.transactions; exception when others then null; end;
  begin alter publication supabase_realtime add table public.budgets;      exception when others then null; end;
  begin alter publication supabase_realtime add table public.categories;   exception when others then null; end;
end $$;
