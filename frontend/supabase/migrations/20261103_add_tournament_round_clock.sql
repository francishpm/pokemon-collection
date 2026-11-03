begin;

alter table public.tournaments
 add column round_minutes integer not null default 30 check(round_minutes between 1 and 1440),
 add column timekeeping_enabled boolean not null default false,
 add column round_started_at timestamptz,
 add column round_ends_at timestamptz;
alter table public.tournament_matches
 add column ready_a boolean not null default false,
 add column ready_b boolean not null default false;
-- Completed/in-progress legacy events keep their original workflow. Open events use readiness.
update public.tournaments set timekeeping_enabled=true where status='registration';

alter function public.create_tournament(text) rename to _create_tournament_without_clock;
revoke all on function public._create_tournament_without_clock(text) from public,anon,authenticated;
create function public.create_tournament(event_name text, duration_minutes integer default 30)
returns uuid language plpgsql security definer set search_path=public as $$
declare tid uuid;
begin
 if duration_minutes is null or duration_minutes not between 1 and 1440 then raise exception 'Escolha uma duração entre 1 e 1440 minutos.'; end if;
 tid:=public._create_tournament_without_clock(event_name);
 update public.tournaments set round_minutes=duration_minutes,timekeeping_enabled=true where id=tid;
 return tid;
end $$;

create function public.set_tournament_duration(tid uuid, duration_minutes integer)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_tournament_admin() then raise exception 'Acesso restrito ao organizador.'; end if;
 if duration_minutes is null or duration_minutes not between 1 and 1440 then raise exception 'Escolha uma duração entre 1 e 1440 minutos.'; end if;
 perform 1 from public.tournaments where id=tid and status='registration' for update;
 if not found then raise exception 'A duração só pode ser alterada antes de gerar a primeira rodada.'; end if;
 update public.tournaments set round_minutes=duration_minutes,timekeeping_enabled=true where id=tid;
end $$;

alter function public.advance_tournament(uuid) rename to _advance_tournament_without_clock;
revoke all on function public._advance_tournament_without_clock(uuid) from public,anon,authenticated;
create function public.advance_tournament(tid uuid) returns void language plpgsql security definer set search_path=public as $$
declare old_round integer;
begin
 if not public.is_tournament_admin() then raise exception 'Acesso restrito ao organizador.'; end if;
 select current_round into old_round from public.tournaments where id=tid for update;
 perform public._advance_tournament_without_clock(tid);
 update public.tournaments set round_started_at=null,round_ends_at=null where id=tid and current_round<>old_round;
end $$;

create function public.ready_tournament_match(mid uuid) returns void language plpgsql security definer set search_path=public as $$
declare t public.tournaments; m public.tournament_matches; eid uuid;
begin
 select t1.* into t from public.tournaments t1 join public.tournament_matches m1 on m1.tournament_id=t1.id where m1.id=mid for update of t1;
 select * into m from public.tournament_matches where id=mid for update;
 if not found then raise exception 'Partida não encontrada.'; end if;
 if t.status<>'active' or not t.timekeeping_enabled or t.round_started_at is not null or m.round<>t.current_round or m.player_b is null or m.result is not null then raise exception 'Esta partida não aceita confirmação de prontidão.'; end if;
 select id into eid from public.tournament_entries where tournament_id=t.id and user_id=auth.uid();
 if eid=m.player_a then update public.tournament_matches set ready_a=true where id=mid;
 elsif eid=m.player_b then update public.tournament_matches set ready_b=true where id=mid;
 else raise exception 'Você não participa desta partida.'; end if;
end $$;

create function public.start_tournament_round(tid uuid) returns void language plpgsql security definer set search_path=public as $$
declare t public.tournaments; started timestamptz;
begin
 if not public.is_tournament_admin() then raise exception 'Acesso restrito ao organizador.'; end if;
 select * into t from public.tournaments where id=tid for update;
 if not found or t.status<>'active' or not t.timekeeping_enabled then raise exception 'Rodada indisponível.'; end if;
 if t.round_started_at is not null then raise exception 'A rodada já começou.'; end if;
 if not exists(select 1 from public.tournament_matches where tournament_id=tid and round=t.current_round and player_b is not null) then raise exception 'Nenhuma mesa disponível.'; end if;
 if exists(select 1 from public.tournament_matches where tournament_id=tid and round=t.current_round and player_b is not null and not (ready_a and ready_b)) then raise exception 'Todos os jogadores precisam confirmar que estão prontos.'; end if;
 started:=clock_timestamp();
 update public.tournaments set round_started_at=started,round_ends_at=started+make_interval(mins=>t.round_minutes) where id=tid;
end $$;

alter function public.report_tournament_result(uuid,text) rename to _report_tournament_without_clock;
revoke all on function public._report_tournament_without_clock(uuid,text) from public,anon,authenticated;
create function public.report_tournament_result(mid uuid, choice text) returns void language plpgsql security definer set search_path=public as $$
declare t public.tournaments;
begin
 select t1.* into t from public.tournaments t1 join public.tournament_matches m on m.tournament_id=t1.id where m.id=mid for update of t1;
 if t.timekeeping_enabled and t.round_started_at is null then raise exception 'Aguarde o organizador iniciar a rodada.'; end if;
 perform public._report_tournament_without_clock(mid,choice);
end $$;

create function public.tournament_server_time(tid uuid) returns timestamptz language plpgsql security definer set search_path=public as $$
begin
 if not public.can_read_tournament(tid) then raise exception 'Acesso restrito aos participantes.'; end if;
 return clock_timestamp();
end $$;

alter function public.correct_tournament_result(uuid,text,text) rename to _correct_tournament_without_clock;
revoke all on function public._correct_tournament_without_clock(uuid,text,text) from public,anon,authenticated;
create function public.correct_tournament_result(mid uuid, corrected text, explanation text) returns void language plpgsql security definer set search_path=public as $$
declare t public.tournaments; match_round integer;
begin
 if not public.is_tournament_admin() then raise exception 'Acesso restrito ao organizador.'; end if;
 select t1.* into t from public.tournaments t1 join public.tournament_matches m on m.tournament_id=t1.id where m.id=mid for update of t1;
 select round into match_round from public.tournament_matches where id=mid;
 if t.timekeeping_enabled and t.round_started_at is null and match_round=t.current_round then raise exception 'Inicie a rodada antes de registrar resultados.'; end if;
 perform public._correct_tournament_without_clock(mid,corrected,explanation);
end $$;

-- Simple Confirm/Cancel UI; authorization remains enforced in the database.
create function public.delete_tournament(tid uuid) returns void language plpgsql security definer set search_path=public as $$
declare c text;
begin
 if not public.is_tournament_admin() then raise exception 'Somente o organizador pode excluir torneios.'; end if;
 select code into c from public.tournaments where id=tid for update;
 if not found then raise exception 'Torneio não encontrado.'; end if;
 perform public.delete_tournament(tid,c);
end $$;

revoke all on function public.create_tournament(text,integer),public.set_tournament_duration(uuid,integer),public.advance_tournament(uuid),public.ready_tournament_match(uuid),public.start_tournament_round(uuid),public.report_tournament_result(uuid,text),public.correct_tournament_result(uuid,text,text),public.tournament_server_time(uuid),public.delete_tournament(uuid) from public,anon;
grant execute on function public.create_tournament(text,integer),public.set_tournament_duration(uuid,integer),public.advance_tournament(uuid),public.ready_tournament_match(uuid),public.start_tournament_round(uuid),public.report_tournament_result(uuid,text),public.correct_tournament_result(uuid,text,text),public.tournament_server_time(uuid),public.delete_tournament(uuid) to authenticated;
commit;
