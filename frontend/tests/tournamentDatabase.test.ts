import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// Executes the actual migration and RPCs on an isolated PostgreSQL engine.
test('tournament lifecycle, RLS, dual confirmation, corrections, byes and no rematches', async () => {
  const db = new PGlite();
  const ids = Array.from({ length: 18 }, (_, i) => `00000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`);
  const scalar = async (sql: string, params: unknown[] = []) => Object.values((await db.query<Record<string, unknown>>(sql, params)).rows[0])[0];
  const asUser = async (id: string) => {
    await db.exec('reset role');
    await db.query("select set_config('test.uid',$1,false)", [id]);
    await db.exec('set role authenticated');
  };
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key,email text);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
      grant usage on schema public,auth to authenticated,anon;
      grant execute on function auth.uid() to authenticated,anon;`);
    for (let i = 0; i < ids.length; i++) await db.query('insert into auth.users values($1,$2)', [ids[i], i === 0 ? 'francishpm@gmail.com' : `player${i}@example.test`]);
    await db.exec(await readFile(new URL('../supabase/migrations/20261103_add_tournaments.sql', import.meta.url), 'utf8'));
    await asUser(ids[1]);
    assert.equal(await scalar('select public.is_tournament_admin()'), false);
    await assert.rejects(db.query("select public.create_tournament('Inválido')"), /organizador/);
    await assert.rejects(db.query('insert into public.tournament_admins values($1)', [ids[1]]), /permission denied/);
    await asUser(ids[0]);
    const tid = await scalar("select public.create_tournament('Liga de teste')") as string;
    const code = await scalar('select code from public.tournaments where id=$1', [tid]);
    assert.match(String(code), /^\d{5}$/);
    await asUser(ids[10]);
    assert.equal(await scalar('select count(*) from public.tournaments'), 0);
    await assert.rejects(db.query('select public._tournament_pair($1,array[]::uuid[])', [tid]), /permission denied/);
    await assert.rejects(db.query("select public.join_tournament('xxxxx','Nome','Deck',6)"), /inválido/);
    for (let i = 0; i < 5; i++) {
      await asUser(ids[i]);
      await db.query('select public.join_tournament($1,$2,$3,$4)', [code, `Jogador ${i}`, 'Dragapult', i + 1]);
    }
    await assert.rejects(db.query('select public.join_tournament($1,$2,$3,$4)', [code, 'Duplicado', 'Deck', 6]), /já está inscrito/);
    await asUser(ids[0]);
    assert.equal(await scalar('select favorite_pokemon from public.tournament_profiles where user_id=$1', [ids[0]]), 1);
    const roster = (await db.query<{ id: string; user_id: string }>('select id,user_id from public.tournament_entries where tournament_id=$1', [tid])).rows;
    const uid = (entry: string) => roster.find(e => e.id === entry)!.user_id;
    await db.query('select public.advance_tournament($1)', [tid]);
    assert.equal(await scalar('select total_rounds from public.tournaments where id=$1', [tid]), 3);
    await assert.rejects(db.query('select public.advance_tournament($1)', [tid]), /todas as partidas/);
    await asUser(ids[8]);
    await assert.rejects(db.query('select public.join_tournament($1,$2,$3,$4)', [code, 'Tarde', 'Deck', 6]), /encerradas/);
    const met = new Set<string>(); const byes = new Set<string>();
    for (let round = 1; round <= 3; round++) {
      await asUser(ids[0]);
      const matches = (await db.query<{ id: string; player_a: string; player_b: string | null; result: string | null }>('select * from public.tournament_matches where tournament_id=$1 and round=$2', [tid, round])).rows;
      assert.equal(matches.length, 3);
      assert.equal(new Set(matches.flatMap(m => [m.player_a, ...(m.player_b ? [m.player_b] : [])])).size, 5);
      for (const m of matches) {
        if (!m.player_b) { assert(!byes.has(m.player_a)); byes.add(m.player_a); assert.equal(m.result, 'bye'); continue; }
        const pair = [m.player_a, m.player_b].sort().join(':'); assert(!met.has(pair)); met.add(pair);
        await asUser(ids[8]);
        await assert.rejects(db.query("select public.report_tournament_result($1,'win')", [m.id]), /participa/);
        await assert.rejects(db.query("select public.correct_tournament_result($1,'a_win','Teste')", [m.id]), /organizador/);
        await asUser(uid(m.player_a));
        await db.query("select public.report_tournament_result($1,'win')", [m.id]);
        assert.equal(await scalar('select result from public.tournament_matches where id=$1', [m.id]), null);
        await asUser(uid(m.player_b));
        await db.query("select public.report_tournament_result($1,'win')", [m.id]);
        assert.equal(await scalar('select result from public.tournament_matches where id=$1', [m.id]), null);
        await db.query("select public.report_tournament_result($1,'loss')", [m.id]);
        assert.equal(await scalar('select result from public.tournament_matches where id=$1', [m.id]), 'a_win');
        await assert.rejects(db.query("select public.report_tournament_result($1,'draw')", [m.id]), /não aceita/);
        await asUser(ids[0]);
        await db.query("select public.correct_tournament_result($1,'draw','Correção de teste')", [m.id]);
      }
      await asUser(ids[0]);
      const rows = (await db.query<{ points: string; op_win: string }>('select * from public.tournament_standings($1)', [tid])).rows;
      assert.equal(rows.length, 5);
      assert.equal(rows.reduce((total, r) => total + Number(r.points), 0), round * 7); // 2 draws + bye
      assert(rows.every(r => Number(r.op_win) === 0.25)); // all played games drawn, byes excluded
      await db.query('select public.advance_tournament($1)', [tid]);
    }
    assert.equal(await scalar('select status from public.tournaments where id=$1', [tid]), 'finished');
    assert.equal(Number(await scalar('select count(*) from public.tournament_result_audit')), 6);
    await assert.rejects(db.query('select public.advance_tournament($1)', [tid]), /indisponível/);
    await asUser(ids[1]);
    await assert.rejects(db.query("update public.tournament_matches set result='a_win' where tournament_id=$1",[tid]), /permission denied/);
    assert.equal(Number(await scalar('select count(*) from public.tournament_result_audit')), 0);
    await asUser(ids[0]);
    const fixture = await scalar("select public.create_tournament('Desempate direto')");
    const fixtureCode = await scalar('select code from public.tournaments where id=$1',[fixture]);
    assert.notEqual(fixtureCode, code);
    for (let i=0;i<4;i++) {
      await asUser(ids[i]);
      await db.query('select public.join_tournament($1,$2,$3,6)',[fixtureCode,`Player ${i}`,'Deck']);
    }
    await asUser(ids[0]);
    await db.query('select public.advance_tournament($1)',[fixture]);
    const drawMatch = (await db.query<{ id: string; player_a: string; player_b: string }>('select * from public.tournament_matches where tournament_id=$1 order by table_number limit 1',[fixture])).rows[0];
    const fixtureRoster = (await db.query<{ id: string; user_id: string }>('select id,user_id from public.tournament_entries where tournament_id=$1',[fixture])).rows;
    await asUser(fixtureRoster.find(e=>e.id===drawMatch.player_a)!.user_id);
    await db.query("select public.report_tournament_result($1,'draw')",[drawMatch.id]);
    await asUser(fixtureRoster.find(e=>e.id===drawMatch.player_b)!.user_id);
    await db.query("select public.report_tournament_result($1,'draw')",[drawMatch.id]);
    assert.equal(await scalar('select result from public.tournament_matches where id=$1',[drawMatch.id]),'draw');
    // A and B finish 2-1, C and D 1-2. Equal resistance, A beat B and C beat D.
    await db.exec('reset role');
    await db.query('delete from public.tournament_matches where tournament_id=$1',[fixture]);
    const entries = ids.slice(0,4).map(id=>fixtureRoster.find(e=>e.user_id===id)!.id);
    for (const [round, table, a, b] of [[1,1,0,1],[1,2,2,3],[2,1,0,2],[2,2,1,3],[3,1,3,0],[3,2,1,2]]) {
      await db.query("insert into public.tournament_matches(tournament_id,round,table_number,player_a,player_b,result) values($1,$2,$3,$4,$5,'a_win')",[fixture,round,table,entries[a],entries[b]]);
    }
    await asUser(ids[0]);
    const ranked = await db.query<{ entry_id: string; points: string }>('select * from public.tournament_standings($1)',[fixture]);
    assert.deepEqual(ranked.rows.map(r=>r.entry_id),entries);
    assert.deepEqual(ranked.rows.map(r=>Number(r.points)),[6,6,3,3]);
    assert.deepEqual((await db.query('select * from public.tournament_standings($1)',[fixture])).rows,ranked.rows);
    // Every attendance boundary uses the actual round calculation, not a copied JS formula.
    for (const [count, rounds] of [[4,3],[8,3],[9,4],[16,4],[17,5],[32,5],[33,6],[64,6],[65,7],[128,7]]) {
      await asUser(ids[0]);
      const event = await scalar("select public.create_tournament('Boundary test')");
      await db.exec('reset role');
      const users = (await db.query<{ id: string }>('insert into auth.users(id,email) select gen_random_uuid(),null from generate_series(1,$1) returning id',[count])).rows;
      for (const u of users) await db.query("insert into public.tournament_entries(tournament_id,user_id,player_name,deck_name,favorite_pokemon) values($1,$2,'Boundary','Deck',6)", [event,u.id]);
      await asUser(ids[0]);
      await db.query('select public.advance_tournament($1)',[event]);
      assert.equal(await scalar('select total_rounds from public.tournaments where id=$1',[event]),rounds);
    }
  } finally { await db.close(); }
});
