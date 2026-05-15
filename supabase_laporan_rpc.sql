-- RPC final untuk koneksi laporan SiOPI ke Supabase.
-- Jalankan seluruh isi file ini di Supabase SQL Editor.
-- File ini membuat jalur baca/simpan laporan tanpa bergantung pada akses tabel langsung dari browser.

create table if not exists public.siopi_laporan (
  id uuid primary key default gen_random_uuid(),
  daerah_irigasi text not null,
  kategori text not null check (kategori in ('operasi', 'pemeliharaan')),
  blanko text not null,
  key_laporan text,
  periode text,
  bendung text,
  mt text,
  tahun text,
  data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.siopi_laporan add column if not exists key_laporan text;
alter table public.siopi_laporan add column if not exists periode text;
alter table public.siopi_laporan add column if not exists bendung text;
alter table public.siopi_laporan add column if not exists mt text;
alter table public.siopi_laporan add column if not exists tahun text;
alter table public.siopi_laporan add column if not exists created_at timestamptz default now();
alter table public.siopi_laporan add column if not exists updated_at timestamptz default now();

update public.siopi_laporan
set key_laporan = coalesce(nullif(trim(key_laporan), ''), bendung, mt, periode, tahun, blanko)
where key_laporan is null or trim(key_laporan) = '';

alter table public.siopi_laporan
  drop constraint if exists siopi_laporan_unique_report;

alter table public.siopi_laporan
  add constraint siopi_laporan_unique_report
  unique (daerah_irigasi, kategori, blanko, key_laporan);

create or replace function public.siopi_save_laporan(p_rows jsonb)
returns table (
  success boolean,
  saved_count integer,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    return query select false, 0, 'Payload laporan harus berupa array.'::text;
    return;
  end if;

  insert into public.siopi_laporan (
    daerah_irigasi,
    kategori,
    blanko,
    key_laporan,
    periode,
    bendung,
    mt,
    tahun,
    data,
    updated_at
  )
  select
    nullif(trim(item->>'daerah_irigasi'), ''),
    nullif(trim(item->>'kategori'), ''),
    nullif(trim(item->>'blanko'), ''),
    coalesce(
      nullif(trim(item->>'key_laporan'), ''),
      nullif(trim(item->>'bendung'), ''),
      nullif(trim(item->>'mt'), ''),
      nullif(trim(item->>'periode'), ''),
      nullif(trim(item->>'tahun'), ''),
      nullif(trim(item->>'blanko'), '')
    ),
    coalesce(item->>'periode', ''),
    coalesce(item->>'bendung', ''),
    coalesce(item->>'mt', ''),
    coalesce(item->>'tahun', ''),
    coalesce(item->'data', '{}'::jsonb),
    now()
  from jsonb_array_elements(p_rows) item
  where nullif(trim(item->>'daerah_irigasi'), '') is not null
    and nullif(trim(item->>'kategori'), '') is not null
    and nullif(trim(item->>'blanko'), '') is not null
  on conflict (daerah_irigasi, kategori, blanko, key_laporan) do update set
    periode = excluded.periode,
    bendung = excluded.bendung,
    mt = excluded.mt,
    tahun = excluded.tahun,
    data = excluded.data,
    updated_at = now();

  get diagnostics v_count = row_count;
  return query select true, v_count, 'Laporan berhasil disimpan.'::text;
end;
$$;

create or replace function public.siopi_get_laporan(
  p_daerah_irigasi text,
  p_blanko text,
  p_kategori text default null,
  p_key_laporan text default null
)
returns table (
  id uuid,
  daerah_irigasi text,
  kategori text,
  blanko text,
  key_laporan text,
  periode text,
  bendung text,
  mt text,
  tahun text,
  data jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    l.id,
    l.daerah_irigasi,
    l.kategori,
    l.blanko,
    l.key_laporan,
    l.periode,
    l.bendung,
    l.mt,
    l.tahun,
    l.data,
    l.created_at,
    l.updated_at
  from public.siopi_laporan l
  where l.daerah_irigasi = p_daerah_irigasi
    and l.blanko = p_blanko
    and (p_kategori is null or l.kategori = p_kategori)
    and (p_key_laporan is null or l.key_laporan = p_key_laporan)
  order by l.created_at desc;
$$;

grant execute on function public.siopi_save_laporan(jsonb) to anon;
grant execute on function public.siopi_get_laporan(text, text, text, text) to anon;
