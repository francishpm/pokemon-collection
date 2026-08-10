create table if not exists public.master_set_catalog (
  set_id text not null,
  card_id text not null,
  variant text not null,
  card_number text not null,
  card_name text not null,
  image_url text not null,
  rarity text,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  primary key (set_id, card_id, variant),
  check (set_id in ('me01', 'me02', 'me02.5', 'me03', 'me04', 'me05', 'me-promos', 'mep')),
  check (variant in ('normal', 'reverse', 'holo', 'energy', 'pokeball', 'first_edition'))
);

create index if not exists master_set_catalog_set_order_idx
  on public.master_set_catalog (set_id, sort_order);

alter table public.master_set_catalog enable row level security;

drop policy if exists "master_set_catalog_read" on public.master_set_catalog;
create policy "master_set_catalog_read" on public.master_set_catalog
  for select to authenticated using (true);

grant select on table public.master_set_catalog to authenticated;
