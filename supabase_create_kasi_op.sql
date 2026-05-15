create extension if not exists pgcrypto with schema extensions;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'siopi_users_role_chk'
      and conrelid = 'siopi_users'::regclass
  ) then
    alter table siopi_users drop constraint siopi_users_role_chk;
  end if;

  if exists (
    select 1
    from pg_constraint
    where conname = 'siopi_users_role_check'
      and conrelid = 'siopi_users'::regclass
  ) then
    alter table siopi_users drop constraint siopi_users_role_check;
  end if;

  alter table siopi_users
    add constraint siopi_users_role_chk
    check (role is null or lower(role) in ('admin', 'operator', 'kasi_op'));
end $$;

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

insert into siopi_users (username, password_hash, nama, role, daerah_irigasi, aktif)
values (
  'kasi_op',
  extensions.crypt('KasiOP#SiOPI2026', extensions.gen_salt('bf')),
  'Kepala Seksi O&P',
  'kasi_op',
  'ALL',
  true
)
on conflict (username) do update set
  password_hash = excluded.password_hash,
  nama = excluded.nama,
  role = excluded.role,
  daerah_irigasi = excluded.daerah_irigasi,
  aktif = excluded.aktif,
  updated_at = now();
