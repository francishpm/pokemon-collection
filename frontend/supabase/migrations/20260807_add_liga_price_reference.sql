alter table public.collection
  add column if not exists liga_lowest_price numeric,
  add column if not exists liga_price_checked_at timestamptz,
  add column if not exists liga_price_url text,
  add column if not exists liga_price_status text
    check (liga_price_status in ('found', 'not_found', 'needs_confirmation', 'error'));

comment on column public.collection.liga_lowest_price is 'Lowest public price found on Liga Pokémon. This is a read-only reference and does not replace liga_value.';
comment on column public.collection.liga_price_checked_at is 'When the Liga Pokémon reference was last manually checked.';
