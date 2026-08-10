alter table public.collection
  add column if not exists liga_price_source_trust text
    check (liga_price_source_trust in ('trusted', 'unverified'));

comment on column public.collection.liga_price_source_trust is
  'Whether the selected Liga Pokémon listing came from a verified/physical store or the unverified fallback.';
