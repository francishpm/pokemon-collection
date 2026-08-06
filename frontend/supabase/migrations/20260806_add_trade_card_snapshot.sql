alter table public.trades
  add column if not exists card_name text,
  add column if not exists card_image_url text,
  add column if not exists card_set_name text,
  add column if not exists card_number text,
  add column if not exists card_set_printed_total integer;

comment on column public.trades.card_name is 'Snapshot of the card name for public trade listings';
comment on column public.trades.card_image_url is 'Snapshot of the small card image URL for public trade listings';
