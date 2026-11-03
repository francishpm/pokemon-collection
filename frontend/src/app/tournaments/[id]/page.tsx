"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Copy, RefreshCw, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { tournamentDetail, tournamentRpc } from '@/services/tournamentService';
import { PokemonSprite } from '@/components/tournaments/PokemonSprite';
import type { Choice, Match } from '@/types/tournament';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

type Detail = Awaited<ReturnType<typeof tournamentDetail>>;
const choiceNames = { win: 'Venci', draw: 'Empate', loss: 'Perdi' };
export default function TournamentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Detail | null>(null);
  const [uid, setUid] = useState('');
  const [admin, setAdmin] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [correction, setCorrection] = useState<Match | null>(null);
  const [corrected, setCorrected] = useState('draw');
  const [reason, setReason] = useState('');
  const [showCelebration, setShowCelebration] = useState<{ result: 'win' | 'draw' | 'loss'; pokemon: number } | null>(null);
  const [audit, setAudit] = useState<{ id: string; match_id: string; old_result: string | null; new_result: string; reason: string; created_at: string }[]>([]);
  const shown = useRef(new Set<string>());
  const load = useCallback(async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const [detail, isAdmin] = await Promise.all([tournamentDetail(id), tournamentRpc<boolean>('is_tournament_admin')]);
      setUid(user?.id ?? ''); setAdmin(isAdmin); setData(detail); setError('');
      if (isAdmin) {
        const matchIds = detail.matches.map(m => m.id);
        if (matchIds.length) {
          const { data: logs, error: logError } = await supabase.from('tournament_result_audit').select('*').in('match_id', matchIds).order('created_at', { ascending: false });
          if (logError) throw new Error(logError.message);
          setAudit(logs ?? []);
        }
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível carregar o evento.'); }
  }, [id]);
  useEffect(() => {
    const initial = setTimeout(() => void load(), 0);
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 10000);
    return () => { clearTimeout(initial); clearInterval(timer); };
  }, [load]);
  useEffect(() => {
    if (!data || !uid) return;
    const me = data.entries.find(e => e.user_id === uid);
    if (!me) return;
    const m = data.matches.find(m => m.round === data.tournament.current_round && (m.player_a === me.id || m.player_b === me.id));
    if (!m?.result || m.result === 'bye') return;
    const key = `${m.id}:${m.result}`;
    const storageKey = `tournament-result:${uid}:${key}`;
    if (shown.current.has(key)) return;
    shown.current.add(key);
    try { if (sessionStorage.getItem(storageKey)) return; sessionStorage.setItem(storageKey, 'seen'); } catch { /* private browser */ }
    const result = m.result === 'draw' ? 'draw' : ((m.player_a === me.id && m.result === 'a_win') || (m.player_b === me.id && m.result === 'b_win')) ? 'win' : 'loss';
    const timer = setTimeout(() => setShowCelebration({ result, pokemon: me.favorite_pokemon }), 0);
    return () => clearTimeout(timer);
  }, [data, uid]);
  async function action(fn: () => Promise<unknown>) {
    setBusy(true);
    try { await fn(); await load(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Não foi possível concluir.'); }
    finally { setBusy(false); }
  }
  function correct(e: FormEvent) {
    e.preventDefault();
    if (correction) void action(async () => {
      await tournamentRpc('correct_tournament_result', { mid: correction.id, corrected, explanation: reason });
      setCorrection(null); setReason(''); toast.success('Correção registrada no histórico.');
    });
  }
  if (!data) return <div className="space-y-4"><Link href="/tournaments">← Torneios</Link><p role={error ? 'alert' : 'status'}>{error || 'Carregando evento…'}</p>{error && <Button onClick={load}>Tentar novamente</Button>}</div>;
  const { tournament: t, entries, matches, standings } = data;
  const me = entries.find(e => e.user_id === uid);
  const current = matches.filter(m => m.round === t.current_round);
  const mine = current.find(m => m.player_a === me?.id || m.player_b === me?.id);
  const player = (entry: string | null) => entries.find(e => e.id === entry);
  const pending = current.filter(m => !m.result).length;
  const report = mine ? mine.player_a === me?.id ? mine.report_a : mine.report_b : null;
  function resultName(m: Match) {
    if (m.result === 'bye') return 'Bye • vitória automática';
    if (m.result === 'draw') return 'Empate confirmado';
    if (m.result) return `Vitória: ${player(m.result === 'a_win' ? m.player_a : m.player_b)?.player_name}`;
    if (m.report_a && m.report_b) return 'Resultados divergentes • corrigir';
    return m.report_a || m.report_b ? 'Aguardando adversário' : 'Aguardando resultados';
  }
  return <div className="space-y-6">
    <Link href="/tournaments" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft size={16} /> Torneios</Link>
    <header className="rounded-2xl border bg-gradient-to-br from-blue-500/10 to-transparent p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-medium text-blue-500">CHALLENGE • CATEGORIA ÚNICA</p><h1 className="mt-2 text-3xl font-bold">{t.name}</h1><p className="mt-2 text-muted-foreground">{t.status === 'registration' ? `${entries.length} inscritos • Inscrições abertas` : `${t.status === 'finished' ? 'Encerrado' : 'Em andamento'} • Rodada ${t.current_round} de ${t.total_rounds}`}</p></div><Button variant="outline" disabled={busy} onClick={load}><RefreshCw size={16} /> Atualizar</Button></div>
      {t.status === 'registration' && <Button variant="outline" className="mt-5 font-mono text-xl tracking-widest" onClick={() => { void navigator.clipboard.writeText(t.code).then(() => toast.success('Código copiado.')).catch(() => toast.error(`Código: ${t.code}`)); }}><Copy size={16} />{t.code}</Button>}
      {admin && <div className="mt-5 flex flex-wrap items-center gap-3"><Button disabled={busy || t.status === 'finished' || (t.status === 'registration' ? entries.length < 4 : pending > 0)} onClick={() => { if (window.confirm(t.status === 'registration' ? 'Encerrar inscrições e gerar a primeira rodada?' : t.current_round === t.total_rounds ? 'Encerrar o campeonato?' : 'Gerar a próxima rodada?')) void action(() => tournamentRpc('advance_tournament', { tid: id })); }}>{busy ? 'Processando…' : t.status === 'registration' ? 'Encerrar inscrições e iniciar' : t.current_round === t.total_rounds ? 'Finalizar torneio' : 'Gerar próxima rodada'}</Button><span className="text-sm text-muted-foreground">{t.status === 'registration' ? 'Mínimo de 4 jogadores para iniciar.' : `${pending} partida(s) pendente(s)`}</span></div>}
      {t.status === 'registration' && !me && <div className="mt-5 rounded-xl border border-blue-500/30 bg-blue-500/5 p-4"><p className="mb-3 text-sm">{admin ? 'Você também pode jogar! Inscreva-se com seu nome, deck e Pokémon favorito.' : 'Inscreva-se para participar deste torneio.'}</p><Button className="min-h-11 w-full sm:w-auto" onClick={() => router.push(`/tournaments?code=${t.code}#inscricao`)}>Participar deste torneio</Button></div>}
      {t.status === 'registration' && me && <p className="mt-4 text-sm text-emerald-500">Você está inscrito como {me.player_name}.</p>}
    </header>
    {error && <p role="alert" className="rounded-lg border border-amber-500 p-3">Falha ao atualizar: {error}</p>}
    {mine && <section className="rounded-2xl border border-blue-500/40 bg-card p-6"><h2 className="text-xl font-bold">Sua partida • {mine.result === 'bye' ? 'Bye' : `Mesa ${mine.table_number}`}</h2><div className="mt-3 flex items-center gap-3"><PokemonSprite number={me!.favorite_pokemon} /><span>{mine.result === 'bye' ? 'Você não joga nesta rodada e recebe 3 pontos.' : `Adversário: ${player(mine.player_a === me?.id ? mine.player_b : mine.player_a)?.player_name}`}</span></div><p className="mt-3 font-medium" role="status">{resultName(mine)}</p>
      {!mine.result && <><p className="mt-2 text-sm text-muted-foreground">Informe o resultado pela sua perspectiva. A partida só é confirmada quando as duas respostas combinam.</p><div className="mt-4 flex flex-wrap gap-3">{(['win','draw','loss'] as Choice[]).map(c => <Button key={c} disabled={busy} variant={report === c ? 'default' : 'outline'} onClick={() => void action(() => tournamentRpc('report_tournament_result', { mid: mine.id, choice: c }))}>{report === c && <CheckCircle2 size={16} />}{choiceNames[c]}</Button>)}</div>{report && <p className="mt-3 text-sm text-muted-foreground">Sua resposta: {choiceNames[report]}. Você pode ajustá-la enquanto a partida estiver pendente.</p>}</>}
    </section>}
    {t.current_round > 0 && <section className="rounded-2xl border bg-card p-6"><h2 className="mb-4 text-xl font-bold">Mesas • Rodada {t.current_round}</h2><div className="grid gap-3 lg:grid-cols-2">{current.map(m => <article key={m.id} className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">{m.player_b ? `Mesa ${m.table_number}` : 'Bye'}</p><p className="mt-1 font-semibold">{player(m.player_a)?.player_name}{m.player_b && ` × ${player(m.player_b)?.player_name}`}</p><p className={`mt-2 text-sm ${m.result ? 'text-emerald-500' : m.report_a && m.report_b ? 'text-amber-500' : 'text-muted-foreground'}`}>{resultName(m)}</p>{admin && m.player_b && <Button className="mt-3" variant="outline" size="sm" onClick={() => { setCorrection(m); setCorrected(m.result ?? 'draw'); }}>Corrigir resultado</Button>}</article>)}</div></section>}
    <section className="rounded-2xl border bg-card p-6"><h2 className="mb-4 flex items-center gap-2 text-xl font-bold"><Trophy size={22} />{t.status === 'registration' ? 'Participantes' : 'Classificação'}</h2><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-muted-foreground"><th className="p-3">Pos.</th><th className="p-3">Jogador / Deck</th><th className="p-3">V–E–D</th><th className="p-3">Pontos</th><th className="p-3">Op. Win %</th><th className="p-3">Op. Op. Win %</th></tr></thead><tbody>{standings.map(s => <tr key={s.entry_id} className={`border-b last:border-0 ${s.entry_id === me?.id ? 'bg-blue-500/5' : ''}`}><td className="p-3">{t.status === 'registration' ? '—' : s.placement}</td><td className="p-3"><div className="flex items-center gap-2"><PokemonSprite number={s.favorite_pokemon} /><div><p className="font-semibold">{s.player_name}</p><p className="text-xs text-muted-foreground">{s.deck_name}</p></div></div></td><td className="whitespace-nowrap p-3">{s.wins}–{s.draws}–{s.losses}</td><td className="p-3 font-bold">{s.points}</td><td className="p-3">{(Number(s.op_win)*100).toFixed(2)}%</td><td className="p-3">{(Number(s.op_op_win)*100).toFixed(2)}%</td></tr>)}</tbody></table></div>{!entries.length && <p className="py-6 text-muted-foreground">Compartilhe o código para receber inscrições.</p>}<p className="mt-4 text-xs text-muted-foreground">Vitória: 3 pontos • Empate: 1 • Derrota: 0. Resistência: vitórias dos adversários e dos adversários deles, com piso de 25%. Empates completos compartilham posição. Só partidas confirmadas entram no cálculo.</p></section>
    {matches.some(m => m.round < t.current_round) && <details className="rounded-xl border p-5"><summary className="cursor-pointer font-semibold">Rodadas anteriores</summary><div className="mt-3 space-y-2">{matches.filter(m => m.round < t.current_round).map(m => <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-3 text-sm"><p>R{m.round} • {player(m.player_a)?.player_name} {m.player_b && `× ${player(m.player_b)?.player_name}`} — {resultName(m)}</p>{admin && m.player_b && <Button size="sm" variant="outline" onClick={() => { setCorrection(m); setCorrected(m.result ?? 'draw'); }}>Corrigir</Button>}</div>)}</div></details>}
    {admin && <details className="rounded-xl border p-5"><summary className="cursor-pointer font-semibold">Histórico de correções ({audit.length})</summary>{audit.map(a => <p key={a.id} className="mt-3 border-t pt-3 text-sm">{new Date(a.created_at).toLocaleString('pt-BR')} • {a.old_result ?? 'Pendente'} → {a.new_result} • {a.reason}</p>)}{!audit.length && <p className="mt-3 text-sm text-muted-foreground">Nenhuma correção registrada.</p>}</details>}
    <p className="text-xs text-muted-foreground">Liguinha independente, sem envio de resultados ao Play! Pokémon. Base de regras: {t.rules_version}. Categorias combinadas, desistências e inscrições tardias não estão disponíveis nesta versão.</p>
    <Dialog open={!!correction} onOpenChange={open => { if (!open) setCorrection(null); }}><DialogContent><form onSubmit={correct} className="space-y-4"><DialogHeader><DialogTitle>Corrigir resultado</DialogTitle><DialogDescription>A correção atualiza a classificação e fica registrada. Rodadas já geradas mantêm seus confrontos.</DialogDescription></DialogHeader><label className="block text-sm">Resultado<select className="mt-2 w-full rounded-lg border bg-background p-3" value={corrected} onChange={e => setCorrected(e.target.value)}><option value="a_win">Vitória: {player(correction?.player_a ?? null)?.player_name}</option><option value="draw">Empate</option><option value="b_win">Vitória: {player(correction?.player_b ?? null)?.player_name}</option></select></label><label className="block text-sm">Motivo<Input autoFocus className="mt-2" required minLength={3} maxLength={300} value={reason} onChange={e => setReason(e.target.value)} /></label><div className="flex gap-3"><Button disabled={busy} type="submit">Salvar correção</Button><Button type="button" variant="outline" onClick={() => setCorrection(null)}>Cancelar</Button></div></form></DialogContent></Dialog>
    <Dialog open={!!showCelebration} onOpenChange={open => { if (!open) setShowCelebration(null); }}><DialogContent className="max-w-sm overflow-hidden text-center">{showCelebration && <>
      {showCelebration.result === 'win' && <div aria-hidden="true" className="tournament-confetti text-3xl">✦ ✨ ★ ✨ ✦</div>}
      <div className={`mx-auto flex justify-center tournament-${showCelebration.result}`}><PokemonSprite key={showCelebration.pokemon} number={showCelebration.pokemon} large /></div>
      <DialogHeader><DialogTitle className="mt-4 text-3xl font-black">{showCelebration.result === 'win' ? 'Vitória!' : showCelebration.result === 'draw' ? 'Empate!' : 'Não foi dessa vez'}</DialogTitle><DialogDescription className="mt-3">{showCelebration.result === 'win' ? 'Resultado confirmado. Boa partida!' : showCelebration.result === 'loss' ? 'Boa sorte na próxima rodada!' : 'Resultado confirmado. Cada jogador recebe 1 ponto.'}</DialogDescription></DialogHeader><Button autoFocus className="mt-6 w-full" onClick={() => setShowCelebration(null)}>Continuar</Button>
    </>}</DialogContent></Dialog>
  </div>;
}
