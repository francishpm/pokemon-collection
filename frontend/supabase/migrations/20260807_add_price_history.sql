create table if not exists public.price_history (
  id uuid primary key default gen_random_uuid(),
  collection_card_id uuid not null references public.collection(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  price numeric not null check (price >= 0),
  created_at timestamptz not null default now()
);

create index if not exists price_history_card_created_at_idx
  on public.price_history (collection_card_id, created_at desc);

create index if not exists price_history_user_created_at_idx
  on public.price_history (user_id, created_at desc);

alter table public.price_history enable row level security;

drop policy if exists "price_history_owner" on public.price_history;
create policy "price_history_owner" on public.price_history
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.record_collection_price_history()
returns trigger
language plpgsql
security invoker
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

drop trigger if exists collection_record_price_history on public.collection;
create trigger collection_record_price_history
after insert or update of liga_value on public.collection
for each row execute function public.record_collection_price_history();

-- Existing prices become the starting point from the day this feature is enabled.
insert into public.price_history (collection_card_id, user_id, price, created_at)
select c.id, c.user_id, c.liga_value, now()
from public.collection c
where c.liga_value is not null
  and c.liga_value > 0
  and not exists (
    select 1 from public.price_history h where h.collection_card_id = c.id
  );
