import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('drop preserves records, excludes future pairings and enforces organizer and pending-match checks',async()=>{
 const db=new PGlite();
 const ids=Array.from({length:6},(_,i)=>`00000000-0000-0000-0000-${String(i+1).padStart(12,'0')}`);
 const scalar=async(sql:string,args:unknown[]=[])=>Object.values((await db.query<Record<string,unknown>>(sql,args)).rows[0])[0];
 const asUser=async(id:string)=>{await db.exec('reset role');await db.query("select set_config('test.uid',$1,false)",[id]);await db.exec('set role authenticated');};
 try {
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
   grant usage on schema auth,public to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
  for(let i=0;i<ids.length;i++)await db.query('insert into auth.users values($1,$2)',[ids[i],i===0?'francishpm@gmail.com':`player${i}@example.test`]);
  for(const file of ['20261103_add_tournaments.sql','20261103_add_tournament_deletion.sql','20261103_add_tournament_round_clock.sql','20261103_restrict_tournament_visibility.sql','20261103_add_monthly_tournament_ranking.sql','20261103_add_tournament_drop.sql'])await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'));

  await asUser(ids[0]);
  const tid=await scalar("select public.create_tournament('Drop test',30)");
  const code=await scalar('select code from public.tournaments where id=$1',[tid]);
  for(let i=0;i<6;i++){await asUser(ids[i]);await db.query('select public.join_tournament($1,$2,$3,6)',[code,`Player ${i}`,'Deck']);}
  await asUser(ids[0]);
  const roster=(await db.query<{id:string}>('select id from public.tournament_entries where tournament_id=$1',[tid])).rows;
  await assert.rejects(db.query('select public.drop_tournament_entry($1)',[roster[0].id]),/andamento/);
  await db.query('select public.advance_tournament($1)',[tid]);
  const matches=(await db.query<{id:string;player_a:string;player_b:string}>('select * from public.tournament_matches where tournament_id=$1 order by table_number',[tid])).rows;
  const dropped=matches[0].player_b;
  await assert.rejects(db.query('select public.drop_tournament_entry($1)',[dropped]),/pendente/);
  await db.exec('reset role');
  await db.query("update public.tournaments set round_started_at=now() where id=$1",[tid]);
  await asUser(ids[0]);
  for(const m of matches)await db.query("select public.correct_tournament_result($1,'a_win','Resultado de teste')",[m.id]);
  const before=(await db.query('select * from public.tournament_standings($1)',[tid])).rows;
  await asUser(ids[1]);
  await assert.rejects(db.query('select public.drop_tournament_entry($1)',[dropped]),/organizador/);
  await assert.rejects(db.query('update public.tournament_entries set dropped_at=now() where id=$1',[dropped]),/permission denied/);
  await asUser(ids[0]);
  await db.query('select public.drop_tournament_entry($1)',[dropped]);
  assert.equal(await scalar('select dropped_round from public.tournament_entries where id=$1',[dropped]),1);
  assert.deepEqual((await db.query('select * from public.tournament_standings($1)',[tid])).rows,before);
  await assert.rejects(db.query('select public.drop_tournament_entry($1)',[dropped]),/registrado/);
  await db.query('select public.advance_tournament($1)',[tid]);
  assert.equal(Number(await scalar('select count(*) from public.tournament_matches where tournament_id=$1 and round=2 and (player_a=$2 or player_b=$2)',[tid,dropped])),0);
  assert.equal(Number(await scalar("select count(*) from public.tournament_matches where tournament_id=$1 and round=2 and result='bye'",[tid])),1);
  assert.equal(await scalar('select round_started_at from public.tournaments where id=$1',[tid]),null);
  await db.exec('reset role');
  await db.query("update public.tournament_matches set result='draw' where tournament_id=$1 and result is null",[tid]);
  await asUser(ids[0]);
  for(const e of roster.filter(e=>e.id!==dropped))await db.query('select public.drop_tournament_entry($1)',[e.id]);
  await db.query('select public.advance_tournament($1)',[tid]);
  assert.equal(await scalar('select status from public.tournaments where id=$1',[tid]),'finished');
  assert.equal(Number(await scalar('select count(*) from public.tournament_standings($1)',[tid])),6);
  assert.equal(Number(await scalar('select count(*) from public.monthly_tournament_ranking(current_date)')),6);
  await assert.rejects(db.query('select public.drop_tournament_entry($1)',[dropped]),/andamento/);
 } finally {await db.close();}
});
