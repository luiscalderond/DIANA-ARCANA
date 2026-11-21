-- Tablas de Diana Arcana. Solo el servidor (clave de servicio) las lee y escribe:
-- RLS activado sin políticas bloquea el acceso público.
create table if not exists public.arcana_suscriptoras (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text not null,
  email text not null,
  referencia text not null,
  dispositivos text[] not null default '{}',
  estado text not null default 'pendiente' check (estado in ('pendiente', 'activa', 'inactiva')),
  activa_hasta timestamptz,
  acepto_datos boolean not null default false,
  creada timestamptz not null default now()
);
create index if not exists arcana_suscriptoras_dispositivos_idx on public.arcana_suscriptoras using gin (dispositivos);
create index if not exists arcana_suscriptoras_email_idx on public.arcana_suscriptoras (email);

create table if not exists public.arcana_consultas (
  id text primary key,
  dispositivo text not null,
  ip text,
  suscriptora_id uuid references public.arcana_suscriptoras (id) on delete set null,
  creada timestamptz not null default now()
);
create index if not exists arcana_consultas_dispositivo_idx on public.arcana_consultas (dispositivo);

alter table public.arcana_suscriptoras enable row level security;
alter table public.arcana_consultas enable row level security;

-- Los proyectos nuevos de Supabase no dan permisos automáticos: el servidor usa service_role.
grant usage on schema public to service_role;
grant all on public.arcana_suscriptoras, public.arcana_consultas to service_role;

-- Opiniones de las clientas al final de cada lectura (estrellas + comentario).
create table if not exists public.arcana_opiniones (
  id uuid primary key default gen_random_uuid(),
  dispositivo text not null,
  estrellas int not null check (estrellas between 1 and 5),
  comentario text,
  tirada text,
  cartas text,
  creada timestamptz not null default now()
);
create index if not exists arcana_opiniones_creada_idx on public.arcana_opiniones (creada desc);
alter table public.arcana_opiniones enable row level security;
grant all on public.arcana_opiniones to service_role;

-- Conversaciones con Arcana (texto, sin fotos). Se guardan con aviso a la clienta y se borran solas a los 90 días.
create table if not exists public.arcana_conversaciones (
  consulta text primary key,
  dispositivo text not null,
  mensajes jsonb not null default '[]',
  creada timestamptz not null default now(),
  actualizada timestamptz not null default now()
);
create index if not exists arcana_conversaciones_actualizada_idx on public.arcana_conversaciones (actualizada desc);
alter table public.arcana_conversaciones enable row level security;
grant all on public.arcana_conversaciones to service_role;
