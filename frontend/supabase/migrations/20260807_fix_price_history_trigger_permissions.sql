create or replace function public.record_collection_price_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.liga_value is not null and new.liga_value > 0 then
      insert into public.price_history (collection_card_id, user_id, price)
      values (new.id, new.user_id, new.liga_value);
    end if;
  elsif new.liga_value is distinct from old.liga_value
    and new.liga_value is not null and new.liga_value > 0 then
    insert into public.price_history (collection_card_id, user_id, price)
    values (new.id, new.user_id, new.liga_value);
  end if;

  return new;
end;
$$;
