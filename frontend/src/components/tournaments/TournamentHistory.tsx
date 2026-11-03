"use client";
import { useState } from 'react';
import Link from 'next/link';
import type { Tournament } from '@/types/tournament';

function eventMonth(t: Tournament) { return t.created_at ? new Date(t.created_at).toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'}).slice(0,7) : ''; }
function monthLabel(m: string) { return m ? new Date(`${m}-01T12:00:00Z`).toLocaleDateString('pt-BR',{timeZone:'UTC',month:'long',year:'numeric'}) : 'Sem data'; }

export function TournamentHistory({ events }: { events: Tournament[] }) {
 const finished=events.filter(t=>t.status==='finished');
 const months=[...new Set(finished.map(eventMonth))].sort().reverse();
 const [selection,setSelection]=useState<string | null>(null);
 const month=selection!==null && months.includes(selection) ? selection : months[0] ?? '';
 return <details className="rounded-2xl border bg-card p-5"><summary className="cursor-pointer font-semibold">Histórico de torneios ({finished.length})</summary>
  {!finished.length ? <p className="mt-4 text-sm text-muted-foreground">Os torneios encerrados ficarão disponíveis aqui.</p> : <div className="mt-4 space-y-4"><label className="block text-sm">Mês de criação<select className="mt-2 min-h-11 w-full rounded-lg border bg-background p-3 capitalize" value={month} onChange={e=>setSelection(e.target.value)}>{months.map(m=><option key={m} value={m}>{monthLabel(m)}</option>)}</select></label><div className="grid gap-3 md:grid-cols-2">{finished.filter(t=>eventMonth(t)===month).map(t=><Link key={t.id} href={`/tournaments/${t.id}`} className="rounded-xl border p-4 hover:border-blue-500"><h3 className="font-semibold">{t.name}</h3><p className="mt-2 text-xs text-muted-foreground">Encerrado • {t.total_rounds} rodadas</p></Link>)}</div></div>}
 </details>;
}
