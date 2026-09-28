-- Ejecuta esto una vez en Supabase -> SQL Editor -> New query -> Run.
-- Una fila por cada visita a una pagina. El script la actualiza cada 15 s
-- mientras el visitante sigue en la pagina (por eso es "en tiempo real").

create table if not exists public.dwell_views (
  view_id          uuid primary key,
  session_id       uuid,
  store            text not null,
  host             text not null,
  path             text not null,
  referrer         text,
  utm_source       text,
  utm_campaign     text,
  device           text,
  dwell_ms         integer not null default 0,
  max_scroll       smallint not null default 0,
  deepest_section  integer not null default -1,
  sections         jsonb not null default '[]'::jsonb,
  add_to_cart      boolean not null default false,
  checkout         boolean not null default false,
  started_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists dwell_views_store_started on public.dwell_views (store, started_at desc);
create index if not exists dwell_views_updated on public.dwell_views (updated_at desc);

-- Seguridad: RLS activado y SIN politicas. Nadie con la clave publica (anon)
-- puede leer ni escribir; solo la app en Vercel con la clave service_role.
alter table public.dwell_views enable row level security;

-- v2: clics con destino, paso del cursor y dwell por altura de la pagina
alter table public.dwell_views add column if not exists max_seen  smallint not null default 0;          -- % de la pagina que llego a ver
alter table public.dwell_views add column if not exists depth_ms  jsonb    not null default '[]'::jsonb; -- ms en cada 10% de altura
alter table public.dwell_views add column if not exists clicks    jsonb    not null default '[]'::jsonb; -- [{x,y,t,s,k,d}]
alter table public.dwell_views add column if not exists moves     jsonb    not null default '[]'::jsonb; -- [[x,y], ...] en milesimas

-- v3: landings que sigues (se agregan desde el panel o la app de escritorio)
create table if not exists public.dwell_landings (
  id         uuid primary key default gen_random_uuid(),
  host       text not null,
  path       text not null,
  name       text not null default '',
  url        text not null,
  created_at timestamptz not null default now(),
  unique (path)
);
alter table public.dwell_landings enable row level security;
