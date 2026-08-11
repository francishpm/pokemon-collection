-- Preserve both sides of the first manual price change, even when a card did
-- not receive the original price-history backfill.
create or replace function public.record_collection_price_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reference_time timestamptz;
begin
  if tg_op = 'INSERT' then
    if new.liga_value is not null and new.liga_value > 0 then
      insert into public.price_history (collection_card_id, user_id, price, source)
      values (new.id, new.user_id, new.liga_value, 'manual');
    end if;
  elsif new.liga_value is distinct from old.liga_value
    and new.liga_value is not null and new.liga_value > 0 then
    if old.liga_value is not null and old.liga_value > 0 and not exists (
      select 1 from public.price_history history
      where history.collection_card_id = new.id and history.source = 'manual'
    ) then
      insert into public.price_history (collection_card_id, user_id, price, source, created_at)
      values (
        old.id, old.user_id, old.liga_value, 'manual',
        coalesce(old.updated_at, old.created_at, now() - interval '1 microsecond')
      );
    end if;

    insert into public.price_history (collection_card_id, user_id, price, source)
    values (new.id, new.user_id, new.liga_value, 'manual');
  end if;

  if new.liga_price_status = 'found'
    and new.liga_lowest_price is not null
    and new.liga_lowest_price > 0
    and (tg_op = 'INSERT' or new.liga_price_checked_at is distinct from old.liga_price_checked_at) then
    reference_time := coalesce(new.liga_price_checked_at, now());

    if not exists (
      select 1 from public.price_history history
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
