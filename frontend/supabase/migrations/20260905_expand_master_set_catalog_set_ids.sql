alter table public.master_set_catalog
  drop constraint if exists master_set_catalog_set_id_check;

alter table public.master_set_catalog
  add constraint master_set_catalog_set_id_check
  check (
    set_id in (
      'me01', 'me02', 'me02.5', 'me03', 'me04', 'me05', 'me-promos', 'mep',
      'sv01', 'sv02', 'sv03', 'sv03.5', 'sv04', 'sv04.5', 'sv05', 'sv06',
      'sv06.5', 'sv07', 'sv08', 'sv08.5', 'sv09', 'sv10', 'sv10.5b',
      'sv10.5w', 'svp', 'sve'
    )
  );
