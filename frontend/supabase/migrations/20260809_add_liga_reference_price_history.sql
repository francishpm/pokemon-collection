alter table public.price_history
  add column if not exists source text not null default 'manual',
  add column if not exists source_trust text;

alter table public.price_history drop constraint if exists price_history_source_check;
alter table public.price_history add constraint price_history_source_check
  check (source in ('manual', 'liga_reference'));

alter table public.price_history drop constraint if exists price_history_source_trust_check;
alter table public.price_history add constraint price_history_source_trust_check
  check (source_trust is null or source_trust in ('trusted', 'unverified'));

create index if not exists price_history_source_card_created_at_idx
  on public.price_history (source, collection_card_id, created_at desc);

create or replace function public.record_collection_price_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reference_time timestamptz;
begin
  if (tg_op = 'INSERT' or new.liga_value is distinct from old.liga_value)
    and new.liga_value is not null and new.liga_value > 0 then
    insert into public.price_history (collection_card_id, user_id, price, source)
    values (new.id, new.user_id, new.liga_value, 'manual');
  end if;

  if new.liga_price_status = 'found'
    and new.liga_lowest_price is not null
    and new.liga_lowest_price > 0
    and (tg_op = 'INSERT' or new.liga_price_checked_at is distinct from old.liga_price_checked_at) then
    reference_time := coalesce(new.liga_price_checked_at, now());

    if not exists (
      select 1
      from public.price_history history
      where history.collection_card_id = new.id
        and history.source = 'liga_reference'
        and history.price = new.liga_lowest_price
        and (history.created_at at time zone 'America/Sao_Paulo')::date
          = (reference_time at time zone 'America/Sao_Paulo')::date
    ) then
      insert into public.price_history (
        collection_card_id, user_id, price, source, source_trust, created_at
      ) values (
        new.id, new.user_id, new.liga_lowest_price, 'liga_reference',
        new.liga_price_source_trust, reference_time
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists collection_record_price_history on public.collection;
create trigger collection_record_price_history
after insert or update of liga_value, liga_lowest_price, liga_price_checked_at on public.collection
for each row execute function public.record_collection_price_history();

insert into public.price_history (
  collection_card_id, user_id, price, source, source_trust, created_at
)
select
  collection.id,
  collection.user_id,
  collection.liga_lowest_price,
  'liga_reference',
  collection.liga_price_source_trust,
  coalesce(collection.liga_price_checked_at, now())
from public.collection
where collection.liga_price_status = 'found'
  and collection.liga_lowest_price is not null
  and collection.liga_lowest_price > 0
  and not exists (
    select 1 from public.price_history history
    where history.collection_card_id = collection.id
      and history.source = 'liga_reference'
  );
