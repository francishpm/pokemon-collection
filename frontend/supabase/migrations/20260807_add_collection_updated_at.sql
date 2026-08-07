alter table public.collection
  add column if not exists updated_at timestamptz not null default now();

update public.collection
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

create or replace function public.set_collection_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists collection_set_updated_at on public.collection;
create trigger collection_set_updated_at
before update on public.collection
for each row execute function public.set_collection_updated_at();

comment on column public.collection.updated_at is 'Timestamp automatically refreshed whenever a collection card is edited.';
