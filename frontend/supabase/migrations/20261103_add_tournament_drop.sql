begin;
alter table public.tournament_entries
 add column dropped_at timestamptz,
 add column dropped_round integer,
 add column dropped_by uuid references auth.users(id),
 add constraint tournament_drop_metadata check (
 (dropped_at is null and dropped_round is null and dropped_by is null) or
 (dropped_at is not null and dropped_round is not null and dropped_round > 0 and dropped_by is not null));

create function public.drop_tournament_entry(eid uuid) returns void
language plpgsql security definer set search_path=public as $$
declare t public.tournaments; e public.tournament_entries;
begin
 if not public.is_tournament_admin() then raise exception 'Acesso restrito ao organizador.'; end if;
 select t1.* into t from public.tournaments t1 join public.tournament_entries e1 on e1.tournament_id=t1.id where e1.id=eid for update of t1;
 if not found or t.status <> 'active' then raise exception 'O drop só pode ser registrado em torneios em andamento.'; end if;
 select * into e from public.tournament_entries where id=eid for update;
 if e.dropped_at is not null then raise exception 'Este jogador já está com drop registrado.'; end if;
 if exists(select 1 from public.tournament_matches where tournament_id=t.id and (player_a=eid or player_b=eid) and result is null) then
 raise exception 'Resolva a partida pendente do jogador antes de registrar o drop.';
 end if;
 update public.tournament_entries set dropped_at=now(),dropped_round=t.current_round,dropped_by=auth.uid() where id=eid;
end $$;
revoke all on function public.drop_tournament_entry(uuid) from public,anon;
grant execute on function public.drop_tournament_entry(uuid) to authenticated;

-- Preserve clock wrapper and standings; exclude drops only from future pairings.
create or replace function public._advance_tournament_without_clock(tid uuid) returns void language plpgsql security definer set search_path = public set statement_timeout='8s' as $$
declare t public.tournaments; n integer; ids uuid[]; bye_id uuid; candidate uuid; solution jsonb; pair jsonb; table_no integer:=0;
begin
 if not public.is_tournament_admin() then raise exception 'Acesso restrito ao organizador.'; end if;
 select * into t from public.tournaments where id=tid for update;
 if not found or t.status='finished' then raise exception 'Torneio indisponível.'; end if;
 if t.status='registration' then
  select count(*) into n from public.tournament_entries where tournament_id=tid;
  if n<4 then raise exception 'São necessários pelo menos quatro jogadores.'; end if;
  if n>128 then raise exception 'Esta versão suporta até 128 jogadores.'; end if;
  t.total_rounds:=case when n<=8 then 3 when n<=16 then 4 when n<=32 then 5 when n<=64 then 6 else 7 end;
 else
  if exists(select 1 from public.tournament_matches where tournament_id=tid and result is null) then raise exception 'Confirme ou resolva todas as partidas antes de avançar.'; end if;
  if t.current_round=t.total_rounds then update public.tournaments set status='finished' where id=tid; return; end if;
 end if;
 if t.status='active' and (select count(*) from public.tournament_entries where tournament_id=tid and dropped_at is null)<2 then
 update public.tournaments set status='finished' where id=tid; return;
 end if;
 select array_agg(e.id order by s.points desc,e.seed,e.id) into ids from public.tournament_entries e join public.tournament_standings(tid) s on s.entry_id=e.id where e.tournament_id=tid and e.dropped_at is null;
 if cardinality(ids)%2=1 then
  -- Lowest scoring eligible player first; retry if the rest cannot be paired.
  for candidate in select e.id from public.tournament_entries e join public.tournament_standings(tid) s on s.entry_id=e.id where e.tournament_id=tid and e.dropped_at is null and not exists(select 1 from public.tournament_matches m where m.tournament_id=tid and m.player_a=e.id and m.result='bye') order by s.points,e.seed desc loop
   solution:=public._tournament_pair(tid,array_remove(ids,candidate));
   if solution is not null then bye_id:=candidate; exit; end if;
  end loop;
 else solution:=public._tournament_pair(tid,ids);
 end if;
 if solution is null then raise exception 'Não há emparceiramento sem repetição disponível. Consulte o organizador.'; end if;
 for pair in select value from jsonb_array_elements(solution) loop
  table_no:=table_no+1;
  insert into public.tournament_matches(tournament_id,round,table_number,player_a,player_b) values(tid,t.current_round+1,table_no,(pair->>0)::uuid,(pair->>1)::uuid);
 end loop;
 if bye_id is not null then insert into public.tournament_matches(tournament_id,round,table_number,player_a,result) values(tid,t.current_round+1,table_no+1,bye_id,'bye'); end if;
 update public.tournaments set current_round=t.current_round+1,total_rounds=t.total_rounds,status='active' where id=tid;
end $$;


revoke all on function public._advance_tournament_without_clock(uuid) from public,anon,authenticated;
create or replace function public.tournament_standings(tid uuid)
returns table(entry_id uuid,player_name text,deck_name text,favorite_pokemon integer,wins bigint,draws bigint,losses bigint,points bigint,op_win numeric,op_op_win numeric,placement bigint)
language plpgsql stable security definer set search_path=public as $$
declare t public.tournaments; eid uuid;
begin
 if not public.can_read_tournament(tid) then return; end if;
 select * into t from public.tournaments where id=tid;
 if not public.is_tournament_admin() and t.status='active' and not exists(select 1 from public.tournament_entries e where e.tournament_id=tid and e.user_id=auth.uid() and e.dropped_at is not null) then
  select e.id into eid from public.tournament_entries e where e.tournament_id=tid and e.user_id=auth.uid();
  if not exists(select 1 from public.tournament_matches m where m.tournament_id=tid and m.round=t.current_round and (m.player_a=eid or m.player_b=eid) and m.result is not null) then return; end if;
 end if;
 return query select * from public._tournament_standings_unrestricted(tid);
end $$;

commit;
