"use client";
import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trophy, KeyRound, Plus, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { listTournaments, tournamentRpc } from '@/services/tournamentService';
import type { Tournament } from '@/types/tournament';
import { PokemonSprite } from '@/components/tournaments/PokemonSprite';
import { TournamentHistory } from '@/components/tournaments/TournamentHistory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const labels = { registration: 'Inscrições abertas', active: 'Em andamento', finished: 'Encerrado' };
export default function TournamentsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Tournament[]>([]);
  const [admin, setAdmin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [deck, setDeck] = useState('');
  const [favorite, setFavorite] = useState(0);
  const [species, setSpecies] = useState<{ number: number; name: string }[]>([]);
  const [search, setSearch] = useState('');
  const [eventName, setEventName] = useState('');
  const [duration, setDuration] = useState(30);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Entre na sua conta para participar.');
      setName(user.user_metadata.full_name ?? '');
      const [list, isAdmin, profile] = await Promise.all([listTournaments(), tournamentRpc<boolean>('is_tournament_admin'), supabase.from('tournament_profiles').select('favorite_pokemon').eq('user_id', user.id).maybeSingle()]);
      if (profile.error) throw new Error(profile.error.message);
      setEvents(list); setAdmin(isAdmin);
      if (profile.data) setFavorite(profile.data.favorite_pokemon);
    } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao carregar torneios.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const initial = setTimeout(() => {
      const eventCode = new URLSearchParams(window.location.search).get('code');
      if (eventCode && /^[0-9]{5}$/.test(eventCode)) setCode(eventCode);
      void load();
    }, 0);
    void fetch('/api/pokemon/species-list').then(r => r.json()).then(d => setSpecies(d.species ?? [])).catch(() => {});
    return () => clearTimeout(initial);
  }, [load]);
  async function join(e: FormEvent) {
    e.preventDefault();
    if (!favorite) { toast.error('Escolha seu Pokémon favorito nos resultados da busca.'); return; }
    setBusy(true);
    try {
      const id = await tournamentRpc<string>('join_tournament', { join_code: code, display_name: name, deck, pokemon: favorite });
      toast.success('Inscrição confirmada!'); router.push(`/tournaments/${id}`);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Não foi possível se inscrever.'); }
    finally { setBusy(false); }
  }
  async function create(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    try { const id = await tournamentRpc<string>('create_tournament', { event_name: eventName, duration_minutes: duration }); router.push(`/tournaments/${id}`); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Erro ao criar evento.'); }
    finally { setBusy(false); }
  }
  const query = search.trim().toLocaleLowerCase('pt-BR');
  const options = query ? species.filter(p => `${p.number} ${p.name}`.toLocaleLowerCase('pt-BR').includes(query)) : [];
  const currentEvents = events.filter(t => t.status !== 'finished');
  return <div className="space-y-8">
    <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 p-6 md:p-8">
      <Trophy className="mb-3 text-blue-500" size={32} /><h1 className="text-3xl font-bold">Sua próxima rodada começa aqui</h1>
      <p className="mt-2 text-muted-foreground">Liguinha TCG • Categoria única • Suíço sem eliminatórias</p>
    </div>
    <Link href="/tournaments/ranking" className="flex min-h-12 items-center justify-between gap-3 rounded-xl border bg-card p-4 font-semibold hover:border-blue-500"><span className="flex items-center gap-2"><Trophy size={20} className="text-blue-500"/> Ranking mensal</span><ArrowRight size={20}/></Link>
    {loading && <p role="status">Carregando torneios…</p>}
    {error && <div role="alert" className="rounded-xl border border-amber-500/40 p-5"><p>{error}</p><Button variant="outline" className="mt-3" onClick={load}>Tentar novamente</Button></div>}
    {!loading && !error && <>
      <div className="grid gap-6 lg:grid-cols-2">
        <form id="inscricao" onSubmit={join} className="scroll-mt-6 space-y-4 rounded-2xl border bg-card p-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold"><KeyRound size={22} /> Entrar com código</h2>
          <label className="block text-sm">Código do torneio<Input className="mt-2 text-xl tracking-[.4em]" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} placeholder="00000" required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} /></label>
          <label className="block text-sm">Seu nome no campeonato<Input className="mt-2" value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={80} /></label>
          <label className="block text-sm">Nome do deck<Input className="mt-2" placeholder="Ex.: Dragapult ex" value={deck} onChange={e => setDeck(e.target.value)} required minLength={2} maxLength={100} /></label>
          <div className="rounded-xl bg-muted/50 p-4">
            <h3 className="font-medium">Seu Pokémon favorito</h3><p className="text-xs text-muted-foreground">Visível aos participantes. Salvo para as próximas inscrições.</p>
            <div className="mt-3 flex items-center gap-3">{favorite > 0 && <PokemonSprite key={favorite} number={favorite} />}<span className="capitalize">{favorite ? species.find(p => p.number === favorite)?.name ?? `Pokémon #${favorite}` : 'Escolha seu parceiro para a liga'}</span></div>
            <label className="mt-3 block text-sm">Buscar Pokémon<Input className="mt-1" autoComplete="off" value={search} onChange={e => setSearch(e.target.value)} placeholder="Digite o nome ou número, ex.: Charizard" aria-describedby="pokemon-search-help" onKeyDown={e => { if (e.key === 'Enter' && query) { e.preventDefault(); if (options.length === 1) { setFavorite(options[0].number); setSearch(''); } } }} /></label>
            <p id="pokemon-search-help" className="mt-2 text-xs text-muted-foreground">Digite para ver as imagens e clique no seu favorito.</p>
            {species.length > 0 && query && <div className="mt-3">
              <p role="status" className="mb-2 text-xs text-muted-foreground">{options.length ? `${options.length} Pokémon encontrado(s)${options.length > 24 ? ' — mostrando os primeiros 24. Continue digitando para refinar.' : ''}` : 'Nenhum Pokémon encontrado. Tente outro nome ou número.'}</p>
              <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto p-1 sm:grid-cols-3" aria-label="Resultados da busca de Pokémon">
                {options.slice(0, 24).map(p => <button type="button" key={p.number} aria-pressed={favorite === p.number} onClick={() => { setFavorite(p.number); setSearch(''); }} className={`flex min-h-28 flex-col items-center justify-center rounded-xl border p-3 text-center transition-colors hover:border-blue-500 hover:bg-blue-500/10 focus-visible:outline-2 focus-visible:outline-blue-500 ${favorite === p.number ? 'border-blue-500 bg-blue-500/10' : 'bg-background'}`}>
                  <PokemonSprite number={p.number} />
                  <span className="mt-1 text-sm font-semibold">{p.name}</span>
                  <span className="text-xs text-muted-foreground">#{p.number}</span>
                </button>)}
              </div>
            </div>}
            {species.length === 0 && <label className="mt-3 block text-sm">Número na Pokédex (catálogo indisponível)<Input type="number" min={1} max={1025} value={favorite || ''} onChange={e => setFavorite(Number(e.target.value))} required /></label>}
          </div>
          <Button disabled={busy} type="submit" className="w-full">{busy ? 'Aguarde…' : 'Confirmar inscrição'}</Button>
        </form>
        <div className="space-y-6">
          {admin && <form onSubmit={create} className="space-y-4 rounded-2xl border bg-card p-6"><h2 className="flex items-center gap-2 text-xl font-semibold"><Plus /> Criar torneio</h2><p className="text-sm text-muted-foreground">Até 128 jogadores. O código é gerado automaticamente e as rodadas são calculadas ao iniciar.</p><label className="block text-sm">Nome do evento<Input className="mt-2" required minLength={3} maxLength={100} value={eventName} onChange={e => setEventName(e.target.value)} placeholder="Liguinha de sábado" /></label><label className="block text-sm">Tempo por rodada (minutos)<Input className="mt-2" type="number" min={1} max={1440} step={1} required value={duration} onChange={e => setDuration(Number(e.target.value))} /></label><Button type="submit" disabled={busy}>Criar torneio</Button></form>}
          <div className="rounded-2xl border bg-card p-6"><h2 className="text-xl font-semibold">Como funciona</h2><ol className="mt-4 list-inside list-decimal space-y-3 text-sm text-muted-foreground"><li>Inscreva-se com o código enviado pelo organizador.</li><li>Confira seu adversário e o número da mesa a cada rodada.</li><li>Os dois informam Venci, Empate ou Perdi.</li><li>Resultados compatíveis atualizam a classificação.</li></ol></div>
        </div>
      </div>
      <section><h2 className="mb-4 text-2xl font-bold">{admin ? 'Torneios da liga' : 'Meus torneios'}</h2>
        {currentEvents.length === 0 && <p className="rounded-xl border border-dashed p-8 text-muted-foreground">Nenhum torneio ainda. Use um código para participar.</p>}
        <div className="grid gap-4 md:grid-cols-2">{currentEvents.map(t => <Link key={t.id} href={`/tournaments/${t.id}`} className="rounded-xl border bg-card p-5 transition-colors hover:border-blue-500"><div className="flex justify-between gap-3"><h3 className="text-lg font-semibold">{t.name}</h3><ArrowRight size={20} /></div><p className="mt-3 text-sm text-blue-500">{labels[t.status]}</p><p className="mt-1 text-sm text-muted-foreground">{t.status === 'registration' ? `Código ${t.code}` : `Rodada ${t.current_round} de ${t.total_rounds}`}</p></Link>)}</div>
      </section>
      <TournamentHistory events={events} />
    </>}
  </div>;
}
