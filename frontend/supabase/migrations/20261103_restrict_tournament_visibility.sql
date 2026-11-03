begin;

drop policy "Tournament matches" on public.tournament_matches;
create policy "Own matches or organizer" on public.tournament_matches for select to authenticated using (
 public.is_tournament_admin() or exists (
  select 1 from public.tournament_entries e where e.tournament_id=tournament_matches.tournament_id
  and e.user_id=auth.uid() and (e.id=tournament_matches.player_a or e.id=tournament_matches.player_b)
 )
);

-- The organizer needs standings to generate pairings. Players unlock them only after
-- their current match has a confirmed result (including a bye), or the event finishes.
alter function public.tournament_standings(uuid) rename to _tournament_standings_unrestricted;
revoke all on function public._tournament_standings_unrestricted(uuid) from public,anon,authenticated;
create function public.tournament_standings(tid uuid)
returns table(entry_id uuid,player_name text,deck_name text,favorite_pokemon integer,wins bigint,draws bigint,losses bigint,points bigint,op_win numeric,op_op_win numeric,placement bigint)
language plpgsql stable security definer set search_path=public as $$
declare t public.tournaments; eid uuid;
begin
 if not public.can_read_tournament(tid) then return; end if;
 select * into t from public.tournaments where id=tid;
 if not public.is_tournament_admin() and t.status='active' then
  select e.id into eid from public.tournament_entries e where e.tournament_id=tid and e.user_id=auth.uid();
  if not exists(select 1 from public.tournament_matches m where m.tournament_id=tid and m.round=t.current_round and (m.player_a=eid or m.player_b=eid) and m.result is not null) then return; end if;
 end if;
 return query select * from public._tournament_standings_unrestricted(tid);
end $$;
revoke all on function public.tournament_standings(uuid) from public,anon;
grant execute on function public.tournament_standings(uuid) to authenticated;
commit;
