import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('all players ready, organizer release, common deadline, next-round reset and simple deletion',async()=>{
 const db=new PGlite();
 const ids=Array.from({length:6},(_,i)=>`00000000-0000-0000-0000-${String(i+1).padStart(12,'0')}`);
 const scalar=async(sql:string,args:unknown[]=[])=>Object.values((await db.query<Record<string,unknown>>(sql,args)).rows[0])[0];
 const asUser=async(id:string)=>{await db.exec('reset role');await db.query("select set_config('test.uid',$1,false)",[id]);await db.exec('set role authenticated');};
 try {
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
   grant usage on schema auth,public to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
  for(let i=0;i<ids.length;i++)await db.query('insert into auth.users values($1,$2)',[ids[i],i===0?'francishpm@gmail.com':`player${i}@example.test`]);
  for(const file of ['20261103_add_tournaments.sql','20261103_add_tournament_deletion.sql','20261103_add_tournament_round_clock.sql'])await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'));
  await asUser(ids[1]);
  await assert.rejects(db.query("select public.create_tournament('Forbidden',45)"),/organizador/);
  await assert.rejects(db.query("select public._create_tournament_without_clock('Forbidden')"),/permission denied/);
  await asUser(ids[0]);
  await assert.rejects(db.query("select public.create_tournament('Invalid',0)"),/duração/);
  const tid=await scalar("select public.create_tournament('Timer test',43)");
  assert.equal(await scalar('select round_minutes from public.tournaments where id=$1',[tid]),43);
  await db.query('select public.set_tournament_duration($1,37)',[tid]);
  const code=await scalar('select code from public.tournaments where id=$1',[tid]);
  for(let i=0;i<5;i++){await asUser(ids[i]);await db.query('select public.join_tournament($1,$2,$3,6)',[code,`Player ${i}`,'Deck']);}
  await asUser(ids[0]);await db.query('select public.advance_tournament($1)',[tid]);
  await assert.rejects(db.query('select public.set_tournament_duration($1,50)',[tid]),/antes/);
  const roster=(await db.query<{id:string;user_id:string}>('select id,user_id from public.tournament_entries where tournament_id=$1',[tid])).rows;
  const owner=(eid:string)=>roster.find(e=>e.id===eid)!.user_id;
  for(let round=1;round<=3;round++){
   await asUser(ids[0]);
   assert.equal(await scalar('select round_started_at from public.tournaments where id=$1',[tid]),null);
   await assert.rejects(db.query('select public.start_tournament_round($1)',[tid]),/Todos os jogadores/);
   const matches=(await db.query<{id:string;player_a:string;player_b:string|null}>('select * from public.tournament_matches where tournament_id=$1 and round=$2 order by table_number',[tid,round])).rows;
   const m=matches.find(m=>m.player_b)!;
   await assert.rejects(db.query("select public.correct_tournament_result($1,'draw','Teste')",[m.id]),/Inicie a rodada/);
   await asUser(owner(m.player_a));
   await assert.rejects(db.query("select public.report_tournament_result($1,'win')",[m.id]),/iniciar a rodada/);
   await asUser(ids[5]);await assert.rejects(db.query('select public.ready_tournament_match($1)',[m.id]),/participa/);
   for(const match of matches){
    if(!match.player_b){await asUser(owner(match.player_a));await assert.rejects(db.query('select public.ready_tournament_match($1)',[match.id]),/prontidão/);continue;}
    for(const eid of [match.player_a,match.player_b]){await asUser(owner(eid));await db.query('select public.ready_tournament_match($1)',[match.id]);}
   }
   await asUser(ids[1]);await assert.rejects(db.query('select public.start_tournament_round($1)',[tid]),/organizador/);
   await asUser(ids[0]);await db.query('select public.start_tournament_round($1)',[tid]);
   const deadline=await scalar('select round_ends_at from public.tournaments where id=$1',[tid]);
   assert.equal(Number(await scalar('select extract(epoch from (round_ends_at-round_started_at)) from public.tournaments where id=$1',[tid])),37*60);
   await assert.rejects(db.query('select public.start_tournament_round($1)',[tid]),/já começou/);
   assert.deepEqual(await scalar('select round_ends_at from public.tournaments where id=$1',[tid]),deadline);
   // Expiration is a warning, never an automatic draw or loss.
   await db.exec('reset role');await db.query("update public.tournaments set round_ends_at=now()-interval '1 second' where id=$1",[tid]);
   for(const match of matches){if(!match.player_b)continue;
    await asUser(owner(match.player_a));await assert.rejects(db.query('select public.ready_tournament_match($1)',[match.id]),/prontidão/);
    await db.query("select public.report_tournament_result($1,'draw')",[match.id]);
    await asUser(owner(match.player_b));await db.query("select public.report_tournament_result($1,'draw')",[match.id]);
   }
   await asUser(ids[0]);await db.query('select public.advance_tournament($1)',[tid]);
  }
  assert.equal(await scalar('select status from public.tournaments where id=$1',[tid]),'finished');
  await asUser(ids[1]);await assert.rejects(db.query('select public.delete_tournament($1)',[tid]),/organizador/);
  await asUser(ids[0]);await db.query('select public.delete_tournament($1)',[tid]);
  assert.equal(Number(await scalar('select count(*) from public.tournaments where id=$1',[tid])),0);
 }finally{await db.close();}
});
