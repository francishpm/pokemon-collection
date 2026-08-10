create table if not exists public.master_set_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  set_id text not null,
  card_id text not null,
  variant text not null,
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  unique (user_id, set_id, card_id, variant)
);

create index if not exists master_set_progress_user_set_idx
  on public.master_set_progress (user_id, set_id);

alter table public.master_set_progress enable row level security;

drop policy if exists "master_set_progress_owner" on public.master_set_progress;
create policy "master_set_progress_owner" on public.master_set_progress
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on table public.master_set_progress to authenticated;
