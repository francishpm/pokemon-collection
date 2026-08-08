create table if not exists public.trade_shares (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token uuid not null unique,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trade_shares enable row level security;
grant select, insert, update, delete on table public.trade_shares to authenticated;

drop policy if exists "trade_shares_owner" on public.trade_shares;
create policy "trade_shares_owner"
on public.trade_shares
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop function if exists public.get_public_trades(uuid);
create function public.get_public_trades(share_token uuid)
returns table (
  id uuid,
  price numeric,
  condition text,
  language text,
  card_id text,
  card_name text,
  card_image_url text,
  card_set_name text,
  card_number text,
  card_set_printed_total integer
)
language sql
security definer
set search_path = public
as $$
  select
    t.id,
    t.price,
    t.condition::text,
    t.language::text,
    t.card_id,
    t.card_name,
    t.card_image_url,
    t.card_set_name,
    t.card_number,
    t.card_set_printed_total
  from public.trade_shares s
  join public.trades t on t.user_id = s.user_id
  where s.token = share_token
    and s.enabled = true
    and t.is_public = true
  order by t.created_at desc;
$$;

revoke all on function public.get_public_trades(uuid) from public;
grant execute on function public.get_public_trades(uuid) to anon, authenticated;

