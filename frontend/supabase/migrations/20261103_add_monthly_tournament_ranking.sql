begin;

-- Private calculation is shared by the access-controlled event view and monthly aggregate.
create or replace function public._tournament_standings_unrestricted(tid uuid)
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
 from public.tournament_entries e left join outcomes o on o.eid=e.id where e.tournament_id=tid group by e.id
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

revoke all on function public._tournament_standings_unrestricted(uuid) from public,anon,authenticated;
create index if not exists tournaments_monthly_finished on public.tournaments(created_at) where status='finished';

create function public.monthly_tournament_ranking(selected_month date)
returns table(placement bigint,player_name text,favorite_pokemon integer,total_points bigint,tournaments_played bigint,wins bigint,draws bigint,losses bigint,is_me boolean)
language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Entre na sua conta para consultar o ranking.'; end if;
 if selected_month is null then raise exception 'Selecione um mês.'; end if;
 return query
 with eligible as (
  select t.id,t.created_at from public.tournaments t where t.status='finished'
  and t.created_at >= (date_trunc('month',selected_month::timestamp) at time zone 'America/Sao_Paulo')
  and t.created_at < ((date_trunc('month',selected_month::timestamp)+interval '1 month') at time zone 'America/Sao_Paulo')
 ), scores as (
  select e.user_id,s.player_name,s.favorite_pokemon,s.wins,s.draws,s.losses,t.created_at,t.id,
  1+case s.placement when 1 then 10 when 2 then 7 when 3 then 5 when 4 then 3 else 0 end awarded
  from eligible t cross join lateral public._tournament_standings_unrestricted(t.id) s
  join public.tournament_entries e on e.id=s.entry_id
 ), totals as (
  select s.user_id,sum(s.awarded)::bigint pts,count(*) events,sum(s.wins)::bigint w,sum(s.draws)::bigint d,sum(s.losses)::bigint l
  from scores s group by s.user_id
 ), latest as (
  select distinct on(s.user_id) s.user_id,s.player_name,s.favorite_pokemon from scores s order by s.user_id,s.created_at desc,s.id desc
 )
 select rank() over(order by t.pts desc),l.player_name,l.favorite_pokemon,t.pts,t.events,t.w,t.d,t.l,t.user_id=auth.uid()
 from totals t join latest l on l.user_id=t.user_id order by t.pts desc,l.player_name,t.user_id;
end $$;

create function public.tournament_ranking_months() returns table(month_start date)
language sql stable security definer set search_path=public as $$
 select distinct date_trunc('month',t.created_at at time zone 'America/Sao_Paulo')::date
 from public.tournaments t where t.status='finished' and auth.uid() is not null order by 1 desc
$$;
revoke all on function public.monthly_tournament_ranking(date),public.tournament_ranking_months() from public,anon;
grant execute on function public.monthly_tournament_ranking(date),public.tournament_ranking_months() to authenticated;
commit;

