alter table public.wishlist add column if not exists pokemon_data jsonb;
alter table public.trades add column if not exists is_public boolean not null default true;

alter table public.collection enable row level security;
alter table public.wishlist enable row level security;
alter table public.trades enable row level security;

drop policy if exists "collection_owner" on public.collection;
create policy "collection_owner" on public.collection for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "wishlist_owner" on public.wishlist;
create policy "wishlist_owner" on public.wishlist for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "trades_owner" on public.trades;
create policy "trades_owner" on public.trades for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.get_public_trades(owner_id uuid)
returns table (id uuid, price numeric, condition text, language text, card_id text, card_name text, card_image_url text, card_set_name text, card_number text, card_set_printed_total integer)
language sql security definer set search_path = public
as $$ select id, price, condition, language, card_id, card_name, card_image_url, card_set_name, card_number, card_set_printed_total from public.trades where user_id = owner_id and is_public = true order by created_at desc $$;
grant execute on function public.get_public_trades(uuid) to anon, authenticated;
