"use client";
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, RefreshCw } from 'lucide-react';
import { tournamentRpc } from '@/services/tournamentService';
import { PokemonSprite } from '@/components/tournaments/PokemonSprite';
import { Button } from '@/components/ui/button';

type Row = { placement: number; player_name: string; favorite_pokemon: number; total_points: number; tournaments_played: number; wins: number; draws: number; losses: number; is_me: boolean };
function thisMonth() { return new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'}).slice(0,7); }
function monthName(value: string) { return new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${value}-01T12:00:00Z`)); }

export default function MonthlyRankingPage() {
 const [month,setMonth]=useState(thisMonth);
 const [months,setMonths]=useState<string[]>([]);
 const [rows,setRows]=useState<Row[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const load=useCallback(async(signal?:AbortSignal)=>{
  setLoading(true);setError('');
  try {
   const [ranking,history]=await Promise.all([
    tournamentRpc<Row[]>('monthly_tournament_ranking',{selected_month:`${month}-01`}),
    tournamentRpc<{month_start:string}[]>('tournament_ranking_months'),
   ]);
   if(!signal?.aborted){setRows(ranking);setMonths(history.map(m=>m.month_start.slice(0,7)));}
  }catch(err){if(!signal?.aborted)setError(err instanceof Error ? err.message : 'Não foi possível carregar o ranking.');}
  finally{if(!signal?.aborted)setLoading(false);}
 },[month]);
 useEffect(()=>{const controller=new AbortController();const timer=setTimeout(()=>void load(controller.signal),0);return()=>{controller.abort();clearTimeout(timer);};},[load]);
 const choices=[...new Set([thisMonth(),month,...months])].sort().reverse();
 const me=rows.find(r=>r.is_me);
 return <div className="space-y-6">
  <Link className="inline-flex items-center gap-2 text-sm text-muted-foreground" href="/tournaments"><ArrowLeft size={16}/> Torneios</Link>
  <header className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-transparent p-6"><Trophy className="mb-3 text-blue-500" size={30}/><h1 className="text-3xl font-bold">Ranking mensal</h1><p className="mt-2 text-sm text-muted-foreground">Sua trajetória na liguinha, mês a mês.</p></header>
  <div className="flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 text-sm font-medium">Mês<select className="mt-2 min-h-11 w-full rounded-lg border bg-background p-3 capitalize" value={month} onChange={e=>setMonth(e.target.value)}>{choices.map(m=><option key={m} value={m}>{monthName(m)}</option>)}</select></label><Button className="min-h-11" variant="outline" disabled={loading} onClick={()=>void load()}><RefreshCw size={16}/> Atualizar</Button></div>
  <p className="text-sm text-muted-foreground">Contam apenas torneios finalizados, pelo mês de criação no horário de Brasília. Excluir um torneio remove seus pontos do ranking.</p>
  {error && <p role="alert" className="rounded-xl border border-amber-500/40 p-4">{error}</p>}
  {loading ? <p role="status">Carregando ranking…</p> : !error && <>
   {me && <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4"><p className="font-semibold">Sua posição: {me.placement}º • {me.total_points} pontos</p><p className="text-sm text-muted-foreground">{me.tournaments_played} torneio(s) no mês</p></div>}
   <section aria-label="Classificação mensal" className="space-y-3">{rows.length===0 ? <p className="rounded-xl border border-dashed p-6 text-muted-foreground">Nenhum torneio finalizado foi criado neste mês.</p> : rows.map((r,i)=><article key={i} className={`rounded-xl border bg-card p-4 ${r.is_me ? 'border-blue-500/50' : ''}`}><div className="flex items-center gap-3"><span className="w-9 shrink-0 text-xl font-bold">{r.placement}º</span><PokemonSprite number={r.favorite_pokemon}/><div className="min-w-0 flex-1"><h2 className="break-words font-semibold">{r.player_name}{r.is_me && <span className="ml-2 text-xs text-blue-500">Você</span>}</h2><p className="text-xs text-muted-foreground">{r.tournaments_played} torneio(s)</p></div><strong className="shrink-0 text-xl text-blue-500">{r.total_points}<span className="ml-1 text-xs font-normal">pts</span></strong></div><p className="mt-3 border-t pt-3 text-xs text-muted-foreground">{r.wins} vitória(s) • {r.draws} empate(s) • {r.losses} derrota(s)</p></article>)}</section>
  </>}
  <details className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">Pontuação do ranking</summary><ul className="mt-3 space-y-2 text-sm"><li>1º: 10 + 1 de participação = <strong>11 pontos</strong></li><li>2º: 7 + 1 = <strong>8 pontos</strong></li><li>3º: 5 + 1 = <strong>6 pontos</strong></li><li>4º: 3 + 1 = <strong>4 pontos</strong></li><li>5º em diante: <strong>1 ponto de participação</strong></li></ul><p className="mt-3 text-xs text-muted-foreground">Somamos todas as participações do mês pela conta do jogador. Pontuações iguais compartilham a posição. Um evento criado em novembro e finalizado em dezembro pontua em novembro.</p></details>
 </div>;
}
