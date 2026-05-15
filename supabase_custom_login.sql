create extension if not exists pgcrypto with schema extensions;

create table if not exists public.siopi_users (
  id uuid primary key default gen_random_uuid(),
  username text,
  password_hash text,
  nama text,
  role text,
  daerah_irigasi text default 'ALL',
  aktif boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.siopi_users add column if not exists username text;
alter table public.siopi_users add column if not exists password_hash text;
alter table public.siopi_users add column if not exists nama text;
alter table public.siopi_users add column if not exists role text;
alter table public.siopi_users add column if not exists daerah_irigasi text default 'ALL';
alter table public.siopi_users add column if not exists aktif boolean default true;
alter table public.siopi_users add column if not exists created_at timestamptz default now();
alter table public.siopi_users add column if not exists updated_at timestamptz default now();

update public.siopi_users set username = lower(trim(username)) where username is not null;
update public.siopi_users set role = lower(trim(role)) where role is not null;
update public.siopi_users set daerah_irigasi = 'ALL' where daerah_irigasi is null or trim(daerah_irigasi) = '';
update public.siopi_users set aktif = true where aktif is null;
update public.siopi_users set created_at = now() where created_at is null;
update public.siopi_users set updated_at = now() where updated_at is null;

alter table public.siopi_users drop constraint if exists siopi_users_role_chk;
alter table public.siopi_users drop constraint if exists siopi_users_role_check;
alter table public.siopi_users drop constraint if exists siopi_users_username_unique;

alter table public.siopi_users
  add constraint siopi_users_role_chk
  check (role is null or lower(role) in ('admin', 'operator', 'kasi_op'));

alter table public.siopi_users
  add constraint siopi_users_username_unique
  unique (username);

alter table public.siopi_users enable row level security;

create or replace function public.login_siopi_user(
  p_username text,
  p_password text
)
returns table (
  success boolean,
  message text,
  username text,
  nama text,
  role text,
  daerah_irigasi text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    true as success,
    'Login berhasil'::text as message,
    u.username,
    coalesce(u.nama, u.username) as nama,
    u.role,
    u.daerah_irigasi
  from public.siopi_users u
  where lower(u.username) = lower(trim(p_username))
    and u.aktif = true
    and u.password_hash = extensions.crypt(p_password, u.password_hash)
  limit 1;

  if not found then
    return query
    select
      false as success,
      'Username atau Password salah!'::text as message,
      null::text as username,
      null::text as nama,
      null::text as role,
      null::text as daerah_irigasi;
  end if;
end;
$$;

grant execute on function public.login_siopi_user(text, text) to anon;

create or replace function public.upsert_siopi_user(
  p_username text,
  p_password text,
  p_nama text,
  p_role text,
  p_daerah_irigasi text,
  p_aktif boolean default true
)
returns table (
  success boolean,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text := lower(trim(p_username));
  v_role text := lower(trim(p_role));
  v_daerah_irigasi text := coalesce(nullif(trim(p_daerah_irigasi), ''), 'ALL');
begin
  if v_username = '' then
    return query select false, 'Username wajib diisi.'::text;
    return;
  end if;

  if p_password is null or length(trim(p_password)) < 6 then
    return query select false, 'Password minimal 6 karakter.'::text;
    return;
  end if;

  if v_role not in ('admin', 'operator', 'kasi_op') then
    return query select false, 'Role harus admin, kepala seksi O&P, atau operator.'::text;
    return;
  end if;

  if v_role in ('admin', 'kasi_op') then
    v_daerah_irigasi := 'ALL';
  end if;

  insert into public.siopi_users (username, password_hash, nama, role, daerah_irigasi, aktif)
  values (
    v_username,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    nullif(trim(p_nama), ''),
    v_role,
    v_daerah_irigasi,
    coalesce(p_aktif, true)
  )
  on conflict (username) do update set
    password_hash = excluded.password_hash,
    nama = excluded.nama,
    role = excluded.role,
    daerah_irigasi = excluded.daerah_irigasi,
    aktif = excluded.aktif,
    updated_at = now();

  return query select true, 'Akun berhasil disimpan.'::text;
end;
$$;

grant execute on function public.upsert_siopi_user(text, text, text, text, text, boolean) to anon;

create or replace function public.list_siopi_users()
returns table (
  username text,
  nama text,
  role text,
  daerah_irigasi text,
  aktif boolean,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    u.username,
    coalesce(u.nama, u.username) as nama,
    u.role,
    u.daerah_irigasi,
    u.aktif,
    u.updated_at
  from public.siopi_users u
  order by
    case
      when u.role = 'admin' then 0
      when u.role = 'kasi_op' then 1
      else 2
    end,
    u.daerah_irigasi,
    u.username;
$$;

grant execute on function public.list_siopi_users() to anon;

insert into public.siopi_users (username, password_hash, nama, role, daerah_irigasi, aktif)
values
  ('admin', extensions.crypt('AdminSiOPI@2026!', extensions.gen_salt('bf')), 'Admin Global', 'admin', 'ALL', true),
  ('kasi_op', extensions.crypt('KasiOP#SiOPI2026', extensions.gen_salt('bf')), 'Kepala Seksi O&P', 'kasi_op', 'ALL', true),
  ('op_mepanga', extensions.crypt('OpMepanga@2026!', extensions.gen_salt('bf')), 'Operator Mepanga', 'operator', 'D.I Mepanga', true),
  ('op_malino', extensions.crypt('OpMalino@2026!', extensions.gen_salt('bf')), 'Operator Malino', 'operator', 'D.I Malino', true)
on conflict (username) do update set
  password_hash = excluded.password_hash,
  nama = excluded.nama,
  role = excluded.role,
  daerah_irigasi = excluded.daerah_irigasi,
  aktif = excluded.aktif,
  updated_at = now();
