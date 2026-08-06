alter table public.collection
  add column if not exists pokemon_data jsonb;

comment on column public.collection.pokemon_data is 'Snapshot of Pokémon card data used to render collections without depending on the external API';
