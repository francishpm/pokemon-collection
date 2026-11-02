-- Existing listings represent one copy; keep their quantity at one.
alter table public.trades
  add column if not exists quantity integer not null default 1
  check (quantity >= 1);
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
  card_set_printed_total integer,
  status text,
  quantity integer
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
    t.card_set_printed_total,
    t.status,
    t.quantity
  from public.trade_shares s
  join public.trades t on t.user_id = s.user_id
  where s.token = share_token
    and s.enabled = true
    and t.is_public = true
    and t.status <> 'completed'
  order by t.created_at desc;
$$;

revoke all on function public.get_public_trades(uuid) from public;
grant execute on function public.get_public_trades(uuid) to anon, authenticated;
