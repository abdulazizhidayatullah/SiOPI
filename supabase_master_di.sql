create table if not exists siopi_daerah_irigasi (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  kode_di text,
  kabupaten text,
  keterangan text,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into siopi_daerah_irigasi (nama, kode_di, kabupaten, aktif)
values
  ('D.I Mepanga', '7200000', 'Parigi Moutong', true),
  ('D.I Malino', null, null, true)
on conflict (nama) do update set
  kode_di = coalesce(excluded.kode_di, siopi_daerah_irigasi.kode_di),
  kabupaten = coalesce(excluded.kabupaten, siopi_daerah_irigasi.kabupaten),
  aktif = excluded.aktif,
  updated_at = now();
