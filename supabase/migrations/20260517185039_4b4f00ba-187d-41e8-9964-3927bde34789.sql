
create type public.app_role as enum ('admin','gestor','vendedor','marketing');
create type public.vehicle_status as enum ('em_preparacao','pronto_venda','vendido','com_sinal');
create type public.expense_category as enum ('preparacao','marketing','gasolina','operacional','comissao','outras');
create type public.margin_type as enum ('valor','percentual');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  email text,
  loja_nome text not null default 'Minha Loja',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create table public.collaborators (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text,
  funcao text,
  salario numeric(12,2) not null default 0,
  comissao_pct numeric(5,2) not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.collaborators enable row level security;

create table public.collaborator_payments (
  id uuid primary key default gen_random_uuid(),
  collaborator_id uuid not null references public.collaborators(id) on delete cascade,
  tipo text not null default 'salario',
  valor numeric(12,2) not null,
  data date not null default current_date,
  descricao text,
  created_at timestamptz not null default now()
);
alter table public.collaborator_payments enable row level security;

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  modelo text not null,
  marca text,
  ano integer,
  placa text,
  km integer,
  cor text,
  valor_compra numeric(12,2) not null default 0,
  valor_preparacao numeric(12,2) not null default 0,
  valor_venda numeric(12,2),
  valor_sugerido numeric(12,2),
  status vehicle_status not null default 'em_preparacao',
  margem_tipo margin_type not null default 'valor',
  margem_min numeric(12,2) not null default 0,
  margem_max numeric(12,2) not null default 0,
  vendedor_id uuid references public.collaborators(id) on delete set null,
  comprador_nome text,
  sinal_valor numeric(12,2),
  vendido_em date,
  observacoes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.vehicles enable row level security;

create table public.vehicle_images (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  storage_path text not null,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.vehicle_images enable row level security;

create table public.vehicle_expenses (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  categoria expense_category not null default 'outras',
  descricao text,
  valor numeric(12,2) not null,
  data date not null default current_date,
  created_at timestamptz not null default now()
);
alter table public.vehicle_expenses enable row level security;

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  categoria expense_category not null,
  descricao text,
  valor numeric(12,2) not null,
  data date not null default current_date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.expenses enable row level security;

create table public.settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  margem_padrao_tipo margin_type not null default 'valor',
  margem_padrao_min numeric(12,2) not null default 5000,
  margem_padrao_max numeric(12,2) not null default 10000,
  tema text not null default 'light',
  updated_at timestamptz not null default now()
);
alter table public.settings enable row level security;

create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_vehicles_updated before update on public.vehicles for each row execute function public.set_updated_at();
create trigger trg_collaborators_updated before update on public.collaborators for each row execute function public.set_updated_at();
create trigger trg_settings_updated before update on public.settings for each row execute function public.set_updated_at();

create policy "profiles read" on public.profiles for select to authenticated using (true);
create policy "profiles insert self" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles update self" on public.profiles for update to authenticated using (auth.uid() = id);

create policy "roles read" on public.user_roles for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "roles admin manage" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "vehicles all" on public.vehicles for all to authenticated using (true) with check (true);
create policy "vehicle_images all" on public.vehicle_images for all to authenticated using (true) with check (true);
create policy "vehicle_expenses all" on public.vehicle_expenses for all to authenticated using (true) with check (true);
create policy "expenses all" on public.expenses for all to authenticated using (true) with check (true);
create policy "collaborators all" on public.collaborators for all to authenticated using (true) with check (true);
create policy "collaborator_payments all" on public.collaborator_payments for all to authenticated using (true) with check (true);

create policy "settings read" on public.settings for select to authenticated using (auth.uid() = user_id);
create policy "settings insert" on public.settings for insert to authenticated with check (auth.uid() = user_id);
create policy "settings update" on public.settings for update to authenticated using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare is_first boolean;
begin
  insert into public.profiles (id, nome, email, loja_nome)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'loja_nome', 'Minha Loja')
  );
  select count(*) = 0 into is_first from public.user_roles;
  insert into public.user_roles (user_id, role)
  values (new.id, case when is_first then 'admin'::app_role else 'gestor'::app_role end);
  insert into public.settings (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into storage.buckets (id, name, public) values ('vehicle-images','vehicle-images', true)
on conflict (id) do nothing;

create policy "vehicle-images read" on storage.objects for select using (bucket_id = 'vehicle-images');
create policy "vehicle-images insert" on storage.objects for insert to authenticated with check (bucket_id = 'vehicle-images');
create policy "vehicle-images update" on storage.objects for update to authenticated using (bucket_id = 'vehicle-images');
create policy "vehicle-images delete" on storage.objects for delete to authenticated using (bucket_id = 'vehicle-images');
