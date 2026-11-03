"use client";
import { useEffect, useState } from 'react';
import type { Standing } from '@/types/tournament';
import { PokemonSprite } from './PokemonSprite';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function TournamentFinish({ eventId, userId, standing: s, total }: { eventId: string; userId: string; standing: Standing; total: number }) {
  const [open,setOpen] = useState(false);
  const key = `tournament-finish:${eventId}:${userId}:${s.placement}:${s.points}`;
  useEffect(() => {
    const timer = setTimeout(() => {
      try { if (localStorage.getItem(key)) return; } catch { /* storage unavailable */ }
      setOpen(true);
    },0);
    return () => clearTimeout(timer);
  },[key]);
  const place=Number(s.placement);
  const message=place===1 ? 'Campeão! Parabéns pela conquista e pelas boas partidas!' : place<=Math.ceil(total/2) ? 'Ótimo resultado! Celebre sua evolução e leve essa confiança para a próxima liguinha!' : 'Cada partida traz um aprendizado. Continue treinando: a próxima liguinha é uma nova chance de brilhar!';
  function close() { setOpen(false); try { localStorage.setItem(key,'seen'); } catch { /* storage unavailable */ } }
  return <>
    <section className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent p-6"><h2 className="text-2xl font-bold">Torneio concluído • Você ficou em {place}º!</h2><p className="mt-2">{message}</p><p className="mt-2 text-sm text-muted-foreground">{s.points} pontos • {s.wins} vitória(s), {s.draws} empate(s), {s.losses} derrota(s) • {total} participantes</p><Button className="mt-4 min-h-11" variant="outline" onClick={()=>setOpen(true)}>Ver minha colocação</Button></section>
    <Dialog open={open} onOpenChange={value=>{if(!value)close();}}><DialogContent className="text-center"><div className="mx-auto"><PokemonSprite number={s.favorite_pokemon} large /></div><DialogHeader><DialogTitle className="text-3xl">{place===1 ? '🏆 Campeão!' : `${place}º lugar!`}</DialogTitle><DialogDescription className="text-base">{s.player_name}, você terminou em {place}º de {total}, com {s.points} pontos. {message}</DialogDescription></DialogHeader><Button autoFocus className="min-h-11" onClick={close}>Ver classificação</Button></DialogContent></Dialog>
  </>;
}
