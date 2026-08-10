create table if not exists public.pokedex_representatives (
  user_id uuid not null references auth.users(id) on delete cascade,
  pokedex_number integer not null check (pokedex_number between 1 and 1025),
  collection_card_id uuid not null references public.collection(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (user_id, pokedex_number)
);

alter table public.pokedex_representatives enable row level security;

grant select, insert, update, delete on table public.pokedex_representatives to authenticated;

drop policy if exists "pokedex_representatives_owner" on public.pokedex_representatives;
create policy "pokedex_representatives_owner"
on public.pokedex_representatives
for all
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.collection
    where collection.id = collection_card_id
      and collection.user_id = auth.uid()
  )
);
