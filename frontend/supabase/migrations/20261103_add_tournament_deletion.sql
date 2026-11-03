begin;

create function public.delete_tournament(tid uuid, confirmation_code text)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tournaments;
begin
 if not public.is_tournament_admin() then raise exception 'Somente o organizador pode excluir torneios.'; end if;
 select * into t from public.tournaments where id=tid for update;
 if not found then raise exception 'Torneio não encontrado.'; end if;
 if confirmation_code is null or trim(confirmation_code)<>t.code then raise exception 'Digite o código do torneio para confirmar a exclusão.'; end if;
 delete from public.tournament_result_audit where match_id in (select id from public.tournament_matches where tournament_id=tid);
 delete from public.tournament_matches where tournament_id=tid;
 delete from public.tournament_entries where tournament_id=tid;
 delete from public.tournaments where id=tid;
end $$;

revoke all on function public.delete_tournament(uuid,text) from public,anon;
grant execute on function public.delete_tournament(uuid,text) to authenticated;
commit;
