"use client";
import { useEffect, useState } from 'react';
import { tournamentRpc } from '@/services/tournamentService';
import type { Tournament } from '@/types/tournament';

export function RoundClock({ tournament: t }: { tournament: Tournament }) {
  const [clock, setClock] = useState<{ server: number; received: number } | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    async function sync() {
      const before = performance.now();
      try {
        const time = await tournamentRpc<string>('tournament_server_time', { tid: t.id });
        const after = performance.now();
        if (active) { setClock({ server: Date.parse(time) + (after-before)/2, received: after }); setError(false); }
      } catch { if (active) setError(true); }
    }
    void sync();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void sync(); }, 30000);
    const visible = () => { if (document.visibilityState === 'visible') void sync(); };
    document.addEventListener('visibilitychange', visible);
    return () => { active=false; clearInterval(timer); document.removeEventListener('visibilitychange',visible); };
  }, [t.id]);
  useEffect(() => {
    const end = t.round_ends_at ? Date.parse(t.round_ends_at) : null;
    const tick = () => { if (clock && end !== null) setRemaining(Math.max(0, Math.ceil((end-clock.server-(performance.now()-clock.received))/1000))); };
    const first = setTimeout(tick,0);
    const timer = setInterval(tick,250);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [clock,t.round_ends_at]);
  return <div className={`rounded-xl border p-5 text-center ${remaining === 0 ? 'border-amber-500 bg-amber-500/10' : 'border-blue-500/30 bg-blue-500/5'}`}>
    <p className="text-sm font-semibold">Tempo da rodada • todas as mesas</p>
    <p className="my-2 font-mono text-5xl font-bold tabular-nums" role="timer" aria-label="Tempo restante">{!t.round_started_at ? `${t.round_minutes ?? 30}:00` : remaining === null ? '—:—' : `${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`}</p>
    <p className="text-sm text-muted-foreground" role="status">{!t.round_started_at ? 'Aguardando prontidão e liberação do organizador.' : remaining === 0 ? 'Tempo encerrado! Aguardem a orientação do organizador e informem o resultado ao concluir.' : 'Rodada em andamento. O prazo é o mesmo para todas as mesas.'}</p>
    {error && <p className="mt-2 text-xs text-amber-500">Não foi possível sincronizar o relógio. Confira a conexão.</p>}
  </div>;
}
