create table if not exists public.collection_shares (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token uuid not null unique,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.collection_shares enable row level security;

grant select, insert, update, delete on table public.collection_shares to authenticated;

drop policy if exists "collection_shares_owner" on public.collection_shares;
create policy "collection_shares_owner"
on public.collection_shares
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.get_public_collection(share_token uuid)
returns table (condition text, language text, pokemon_data jsonb)
language sql
security definer
set search_path = public
as $$
  select
    c.condition::text,
    c.language::text,
    jsonb_build_object(
      'id', c.pokemon_data -> 'id',
      'name', c.pokemon_data -> 'name',
      'number', c.pokemon_data -> 'number',
      'images', c.pokemon_data -> 'images',
      'nationalPokedexNumbers', c.pokemon_data -> 'nationalPokedexNumbers',
      'rarity', c.pokemon_data -> 'rarity',
      'supertype', c.pokemon_data -> 'supertype',
      'subtypes', c.pokemon_data -> 'subtypes',
      'set', c.pokemon_data -> 'set'
    ) as pokemon_data
  from public.collection_shares s
  join public.collection c on c.user_id = s.user_id
  where s.token = share_token
    and s.enabled = true
    and c.pokemon_data is not null
  order by c.created_at desc;
$$;

revoke all on function public.get_public_collection(uuid) from public;
grant execute on function public.get_public_collection(uuid) to anon, authenticated;

