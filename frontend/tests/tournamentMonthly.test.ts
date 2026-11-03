import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('monthly points, participation, creation month in Sao Paulo, history and deletion',async()=>{
 const db=new PGlite();
 const ids=Array.from({length:7},(_,i)=>`00000000-0000-0000-0000-${String(i+1).padStart(12,'0')}`);
 const asUser=async(id:string)=>{await db.exec('reset role');await db.query("select set_config('test.uid',$1,false)",[id]);await db.exec('set role authenticated');};
 const ranking=async(month='2026-11-01')=>(await db.query<{total_points:string;placement:string;is_me:boolean;player_name:string;tournaments_played:string}>('select * from public.monthly_tournament_ranking($1)',[month])).rows;
 try {
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
   grant usage on schema auth,public to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
  for(let i=0;i<ids.length;i++)await db.query('insert into auth.users values($1,$2)',[ids[i],i===0?'francishpm@gmail.com':`player${i}@example.test`]);
  for(const file of ['20261103_add_tournaments.sql','20261103_add_tournament_deletion.sql','20261103_add_tournament_round_clock.sql','20261103_restrict_tournament_visibility.sql','20261103_add_monthly_tournament_ranking.sql'])await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'));
  async function event(created:string,status='finished',suffix='') {
   await db.exec('reset role');
   const tid=(await db.query<{id:string}>("insert into public.tournaments(name,code,owner_id,status,created_at,total_rounds,current_round) values('Monthly test',lpad((select count(*)+1 from public.tournaments)::text,5,'0'),$1,$2,$3,3,3) returning id",[ids[0],status,created])).rows[0].id;
   const entries:string[]=[];
   for(let i=0;i<6;i++)entries.push((await db.query<{id:string}>("insert into public.tournament_entries(tournament_id,user_id,player_name,deck_name,favorite_pokemon,seed) values($1,$2,$3,'Deck',6,$4) returning id",[tid,ids[i],`Player ${i}${suffix}`,i])).rows[0].id);
   for(const [r,table,a,b] of [[1,1,0,1],[1,2,2,3],[1,3,4,5],[2,1,0,2],[2,2,1,4],[2,3,3,5],[3,1,0,3],[3,2,1,5],[3,3,2,4]])await db.query("insert into public.tournament_matches(tournament_id,round,table_number,player_a,player_b,result) values($1,$2,$3,$4,$5,'draw')",[tid,r,table,entries[a],entries[b]]);
   return tid;
  }
  await event('2026-11-01T03:00:00Z');
  const second=await event('2026-12-01T02:59:59Z','finished',' updated');
  await event('2026-12-01T03:00:00Z');
  await event('2026-11-01T02:59:59Z');
  await event('2026-11-15T12:00:00Z','active');
  await event('2026-11-15T12:00:00Z','registration');
  await asUser(ids[6]); // No membership: monthly leaderboard must still aggregate all finished events.
  let rows=await ranking();
  assert.deepEqual(rows.map(r=>Number(r.total_points)),[22,16,12,8,2,2]);
  assert.deepEqual(rows.map(r=>Number(r.placement)),[1,2,3,4,5,5]);
  assert(rows.every(r=>Number(r.tournaments_played)===2 && r.player_name.endsWith('updated')));
  assert(rows.every(r=>!r.is_me));
  assert.equal((await db.query('select * from public.tournament_standings($1)',[second])).rows.length,0);
  await assert.rejects(db.query('select * from public._tournament_standings_unrestricted($1)',[second]),/permission denied/);
  assert.deepEqual((await db.query<{month_start:Date}>('select * from public.tournament_ranking_months()')).rows.map(r=>r.month_start.toISOString().slice(0,10)),['2026-12-01','2026-11-01','2026-10-01']);
  assert.equal((await ranking('2026-09-01')).length,0);
  assert.deepEqual((await ranking('2026-12-01')).map(r=>Number(r.total_points)),[11,8,6,4,1,1]);
  await asUser(ids[1]);assert.equal((await ranking()).find(r=>r.is_me)?.player_name,'Player 1 updated');
  await asUser(ids[0]);await db.query('select public.delete_tournament($1)',[second]);
  rows=await ranking();assert.deepEqual(rows.map(r=>Number(r.total_points)),[11,8,6,4,1,1]);
  await db.exec('reset role; set role anon');await assert.rejects(db.query("select * from public.monthly_tournament_ranking('2026-11-01')"),/permission denied/);
 }finally{await db.close();}
});
