import { supabase } from '@/lib/supabase';
import type { Entry, Match, Standing, Tournament } from '@/types/tournament';

export async function tournamentRpc<T = void>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}
export async function listTournaments(): Promise<Tournament[]> {
  const { data, error } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.code === 'PGRST205' || error.code === '42P01' ? 'O módulo de torneios precisa da migração do banco. Consulte o organizador.' : error.message);
  return data ?? [];
}
export async function tournamentDetail(id: string) {
  const results = await Promise.all([
    supabase.from('tournaments').select('*').eq('id', id).single(),
    supabase.from('tournament_entries').select('*').eq('tournament_id', id),
    supabase.from('tournament_matches').select('*').eq('tournament_id', id).order('round').order('table_number'),
    supabase.rpc('tournament_standings', { tid: id }),
  ]);
  for (const result of results) if (result.error) throw new Error(result.error.message);
  return { tournament: results[0].data as Tournament, entries: results[1].data as Entry[], matches: results[2].data as Match[], standings: results[3].data as Standing[] };
}
