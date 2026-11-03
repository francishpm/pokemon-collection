begin;

create table public.tournament_admins (user_id uuid primary key references auth.users(id));
insert into public.tournament_admins select id from auth.users where lower(email) = 'francishpm@gmail.com';
alter table public.tournament_admins enable row level security;
create policy "Read own organizer role" on public.tournament_admins for select to authenticated using (user_id = auth.uid());

create function public.is_tournament_admin() returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.tournament_admins where user_id = auth.uid()) $$;

create table public.tournament_profiles (
 user_id uuid primary key references auth.users(id),
 favorite_pokemon integer not null check (favorite_pokemon between 1 and 1025)
);
create table public.tournaments (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(name) between 3 and 100),
 code text unique not null check (code ~ '^[0-9]{5}$'),
 owner_id uuid not null references auth.users(id),
 status text not null default 'registration' check (status in ('registration','active','finished')),
 format text not null default 'challenge' check (format = 'challenge'),
 rules_version text not null default 'Play! Pokemon handbook 2025-01-01 / Swiss Only; revisão vigente pendente',
 total_rounds integer not null default 0,
 current_round integer not null default 0,
 created_at timestamptz not null default now()
);
create table public.tournament_entries (
 id uuid primary key default gen_random_uuid(),
 tournament_id uuid not null references public.tournaments(id),
 user_id uuid not null references auth.users(id),
 player_name text not null check (char_length(player_name) between 2 and 80),
 deck_name text not null check (char_length(deck_name) between 2 and 100),
 favorite_pokemon integer not null check (favorite_pokemon between 1 and 1025),
 seed double precision not null default random(),
 joined_at timestamptz not null default now(),
 unique(tournament_id,user_id), unique(tournament_id,id)
);
create table public.tournament_matches (
 id uuid primary key default gen_random_uuid(),
 tournament_id uuid not null references public.tournaments(id),
 round integer not null check (round > 0),
 table_number integer not null,
 player_a uuid not null,
 player_b uuid,
 report_a text check (report_a in ('win','draw','loss')),
 report_b text check (report_b in ('win','draw','loss')),
 result text check (result in ('a_win','draw','b_win','bye')),
 check (player_a <> player_b),
 check ((player_b is null and result = 'bye') or (player_b is not null and (result is null or result <> 'bye'))),
 foreign key(tournament_id,player_a) references public.tournament_entries(tournament_id,id),
 foreign key(tournament_id,player_b) references public.tournament_entries(tournament_id,id),
 unique(tournament_id,round,table_number)
);
create table public.tournament_result_audit (
 id uuid primary key default gen_random_uuid(),
 match_id uuid not null references public.tournament_matches(id),
 actor_id uuid not null references auth.users(id),
 old_result text, new_result text not null, reason text not null check(char_length(reason) between 3 and 300),
 created_at timestamptz not null default now()
);
create index on public.tournament_entries(user_id);
create index on public.tournament_matches(tournament_id,round);

create function public.can_read_tournament(tid uuid) returns boolean language sql stable security definer set search_path = public
as $$ select public.is_tournament_admin() or exists(select 1 from public.tournament_entries where tournament_id=tid and user_id=auth.uid()) $$;
alter table public.tournament_profiles enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_entries enable row level security;
alter table public.tournament_matches enable row level security;
alter table public.tournament_result_audit enable row level security;
create policy "Own favorite" on public.tournament_profiles for select to authenticated using(user_id=auth.uid());
create policy "Tournament members" on public.tournaments for select to authenticated using(public.can_read_tournament(id));
create policy "Tournament roster" on public.tournament_entries for select to authenticated using(public.can_read_tournament(tournament_id));
create policy "Tournament matches" on public.tournament_matches for select to authenticated using(public.can_read_tournament(tournament_id));
create policy "Organizer audit" on public.tournament_result_audit for select to authenticated using(public.is_tournament_admin());

create function public.create_tournament(event_name text) returns uuid language plpgsql security definer set search_path = public as $$
declare tid uuid; attempt integer; c text;
begin
 if not public.is_tournament_admin() then raise exception 'Somente o organizador pode criar torneios.'; end if;
 for attempt in 1..100 loop
  c := lpad(floor(random()*100000)::integer::text,5,'0');
  begin
   insert into public.tournaments(name,code,owner_id) values(trim(event_name),c,auth.uid()) returning id into tid;
   return tid;
  exception when unique_violation then null;
  end;
 end loop;
 raise exception 'Não foi possível gerar um código. Tente novamente.';
end $$;

create function public.join_tournament(join_code text, display_name text, deck text, pokemon integer) returns uuid language plpgsql security definer set search_path = public as $$
declare t public.tournaments;
begin
 if auth.uid() is null then raise exception 'Entre na sua conta.'; end if;
 select * into t from public.tournaments where code=trim(join_code) for update;
 if not found then raise exception 'Código de torneio inválido.'; end if;
 if t.status <> 'registration' then raise exception 'As inscrições estão encerradas.'; end if;
 if exists(select 1 from public.tournament_entries where tournament_id=t.id and user_id=auth.uid()) then raise exception 'Você já está inscrito neste torneio.'; end if;
 if (select count(*) from public.tournament_entries where tournament_id=t.id)>=128 then raise exception 'Este torneio atingiu o limite de 128 jogadores.'; end if;
 insert into public.tournament_profiles values(auth.uid(),pokemon) on conflict(user_id) do update set favorite_pokemon=excluded.favorite_pokemon;
 insert into public.tournament_entries(tournament_id,user_id,player_name,deck_name,favorite_pokemon)
 values(t.id,auth.uid(),trim(display_name),trim(deck),pokemon);
 return t.id;
end $$;

-- No drops in this initial version: win rate is wins / completed rounds (draws are not half wins).
-- Byes award points but are excluded from both numerator and denominator of resistance.
create function public.tournament_standings(tid uuid)
returns table(entry_id uuid,player_name text,deck_name text,favorite_pokemon integer,wins bigint,draws bigint,losses bigint,points bigint,op_win numeric,op_op_win numeric,placement bigint)
language sql stable security definer set search_path = public as $$
with outcomes as (
 select player_a eid,player_b opponent,result in ('a_win','bye') won,result='draw' tied,result='b_win' lost from public.tournament_matches where tournament_id=tid and result is not null
 union all
 select player_b,player_a,result='b_win',result='draw',result='a_win' from public.tournament_matches where tournament_id=tid and player_b is not null and result is not null
), records as (
 select e.id,e.player_name,e.deck_name,e.favorite_pokemon,e.seed,
 count(*) filter(where o.won) w,count(*) filter(where o.tied) d,count(*) filter(where o.lost) l,
 greatest(0.25,coalesce((count(*) filter(where o.won and o.opponent is not null))::numeric/nullif(count(*) filter(where o.opponent is not null),0),0.25)) rate
 from public.tournament_entries e left join outcomes o on o.eid=e.id where e.tournament_id=tid and public.can_read_tournament(tid) group by e.id
), resistance as (
 select r.*,coalesce((select avg(r2.rate) from outcomes o join records r2 on r2.id=o.opponent where o.eid=r.id),0.25) ow from records r
), final as (
 select r.*,coalesce((select avg(r2.ow) from outcomes o join resistance r2 on r2.id=o.opponent where o.eid=r.id),0.25) oow from resistance r
), tied as (
 select f.*,count(*) over(partition by 3*w+d,ow,oow) tie_count from final f
), ranked as (
 select f.*,case when tie_count=2 then coalesce((
  select case when (m.player_a=f.id and m.result='a_win') or (m.player_b=f.id and m.result='b_win') then 1
   when m.result='draw' then 0 else -1 end
  from public.tournament_matches m join tied other on other.id=case when m.player_a=f.id then m.player_b else m.player_a end
  where m.tournament_id=tid and (m.player_a=f.id or m.player_b=f.id) and m.result is not null
   and other.w*3+other.d=f.w*3+f.d and other.ow=f.ow and other.oow=f.oow limit 1
 ),0) else 0 end head_to_head from tied f
)
select id,player_name,deck_name,favorite_pokemon,w,d,l,3*w+d,ow,oow,
 row_number() over(order by 3*w+d desc,ow desc,oow desc,head_to_head desc,seed,id)
 from ranked order by 3*w+d desc,ow desc,oow desc,head_to_head desc,seed,id
$$;

-- Backtracking pairs adjacent score groups; rejects all rematches rather than silently repeating.
create function public._tournament_pair(tid uuid, remaining uuid[]) returns jsonb language plpgsql security definer set search_path = public as $$
declare a uuid; b uuid; rest uuid[]; solution jsonb;
begin
 if cardinality(remaining)=0 then return '[]'::jsonb; end if;
 a:=remaining[1];
 foreach b in array remaining[2:cardinality(remaining)] loop
  if not exists(select 1 from public.tournament_matches where tournament_id=tid and ((player_a=a and player_b=b) or (player_a=b and player_b=a))) then
   rest:=array_remove(array_remove(remaining,a),b);
   solution:=public._tournament_pair(tid,rest);
   if solution is not null then return jsonb_build_array(jsonb_build_array(a,b)) || solution; end if;
  end if;
 end loop;
 return null;
end $$;

create function public.advance_tournament(tid uuid) returns void language plpgsql security definer set search_path = public set statement_timeout='8s' as $$
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
 select array_agg(e.id order by s.points desc,e.seed,e.id) into ids from public.tournament_entries e join public.tournament_standings(tid) s on s.entry_id=e.id where e.tournament_id=tid;
 if cardinality(ids)%2=1 then
  -- Lowest scoring eligible player first; retry if the rest cannot be paired.
  for candidate in select e.id from public.tournament_entries e join public.tournament_standings(tid) s on s.entry_id=e.id where e.tournament_id=tid and not exists(select 1 from public.tournament_matches m where m.tournament_id=tid and m.player_a=e.id and m.result='bye') order by s.points,e.seed desc loop
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

create function public.report_tournament_result(mid uuid, choice text) returns void language plpgsql security definer set search_path = public as $$
declare m public.tournament_matches; t public.tournaments; eid uuid;
begin
 if choice not in ('win','draw','loss') or choice is null then raise exception 'Resultado inválido.'; end if;
 -- Lock order is shared by all operations: event then match.
 select t1.* into t from public.tournaments t1 join public.tournament_matches m1 on m1.tournament_id=t1.id where m1.id=mid for update of t1;
 select * into m from public.tournament_matches where id=mid for update;
 if not found then raise exception 'Partida não encontrada.'; end if;
 if t.status<>'active' or m.round<>t.current_round or m.result is not null then raise exception 'Esta partida não aceita novos resultados.'; end if;
 select id into eid from public.tournament_entries where tournament_id=m.tournament_id and user_id=auth.uid();
 if eid=m.player_a then m.report_a:=choice;
 elsif eid=m.player_b then m.report_b:=choice;
 else raise exception 'Você não participa desta partida.'; end if;
 m.result:=case when m.report_a='win' and m.report_b='loss' then 'a_win' when m.report_a='loss' and m.report_b='win' then 'b_win' when m.report_a='draw' and m.report_b='draw' then 'draw' else null end;
 update public.tournament_matches set report_a=m.report_a,report_b=m.report_b,result=m.result where id=mid;
end $$;

create function public.correct_tournament_result(mid uuid, corrected text, explanation text) returns void language plpgsql security definer set search_path = public as $$
declare m public.tournament_matches;
begin
 if not public.is_tournament_admin() then raise exception 'Acesso restrito ao organizador.'; end if;
 if corrected not in ('a_win','draw','b_win') or corrected is null then raise exception 'Resultado inválido.'; end if;
 perform 1 from public.tournaments t join public.tournament_matches m1 on m1.tournament_id=t.id where m1.id=mid for update of t;
 select * into m from public.tournament_matches where id=mid for update;
 if not found or m.player_b is null then raise exception 'Partida inválida para correção.'; end if;
 insert into public.tournament_result_audit(match_id,actor_id,old_result,new_result,reason) values(mid,auth.uid(),m.result,corrected,trim(explanation));
 update public.tournament_matches set result=corrected where id=mid;
end $$;

-- Only these RPCs can mutate data. Roles cannot be self-assigned through a browser request.
revoke all on public.tournament_admins,public.tournament_profiles,public.tournaments,public.tournament_entries,public.tournament_matches,public.tournament_result_audit from anon,authenticated;
grant select on public.tournament_admins,public.tournament_profiles,public.tournaments,public.tournament_entries,public.tournament_matches,public.tournament_result_audit to authenticated;
revoke all on function public._tournament_pair(uuid,uuid[]) from public,anon,authenticated;
revoke all on function public.is_tournament_admin(),public.can_read_tournament(uuid),public.create_tournament(text),public.join_tournament(text,text,text,integer),public.tournament_standings(uuid),public.advance_tournament(uuid),public.report_tournament_result(uuid,text),public.correct_tournament_result(uuid,text,text) from public,anon;
grant execute on function public.is_tournament_admin(),public.can_read_tournament(uuid),public.create_tournament(text),public.join_tournament(text,text,text,integer),public.tournament_standings(uuid),public.advance_tournament(uuid),public.report_tournament_result(uuid,text),public.correct_tournament_result(uuid,text,text) to authenticated;
commit;
