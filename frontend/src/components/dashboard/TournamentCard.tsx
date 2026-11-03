"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, ArrowRight } from 'lucide-react';
import { listTournaments } from '@/services/tournamentService';
import type { Tournament } from '@/types/tournament';

export function TournamentCard() {
  const [events, setEvents] = useState<Tournament[]>([]);
  useEffect(() => { void listTournaments().then(list => setEvents(list.filter(t => t.status === 'active'))).catch(() => {}); }, []);
  if (!events.length) return null;
  return <section className="rounded-2xl border border-blue-500/30 bg-card p-6"><h2 className="flex items-center gap-2 text-lg font-semibold"><Trophy size={20} className="text-blue-500" /> Meu torneio</h2>{events.map(t => <Link key={t.id} href={`/tournaments/${t.id}`} className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-blue-500/5 p-4 hover:bg-blue-500/10"><div><p className="font-semibold">{t.name}</p><p className="text-sm text-muted-foreground">Rodada {t.current_round} de {t.total_rounds} • Ver partida e informar resultado</p></div><ArrowRight size={20} /></Link>)}</section>;
}
