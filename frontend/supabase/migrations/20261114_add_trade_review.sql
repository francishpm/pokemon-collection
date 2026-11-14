-- Existing and newly added trades start unreviewed.
begin;
alter table public.trades
  add column if not exists reviewed boolean not null default false;
comment on column public.trades.reviewed is 'Owner review of the physical trade binder; set on successful editor save.';
commit;
