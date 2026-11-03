export type Tournament = { id: string; name: string; code: string; status: 'registration' | 'active' | 'finished'; current_round: number; total_rounds: number; rules_version: string; created_at?: string; round_minutes?: number; timekeeping_enabled?: boolean; round_started_at?: string | null; round_ends_at?: string | null };
export type Entry = { id: string; user_id: string; player_name: string; deck_name: string; favorite_pokemon: number };
export type Choice = 'win' | 'draw' | 'loss';
export type Match = { id: string; round: number; table_number: number; player_a: string; player_b: string | null; report_a: Choice | null; report_b: Choice | null; result: 'a_win' | 'b_win' | 'draw' | 'bye' | null; ready_a?: boolean; ready_b?: boolean };
export type Standing = { entry_id: string; player_name: string; deck_name: string; favorite_pokemon: number; wins: number; draws: number; losses: number; points: number; op_win: number; op_op_win: number; placement: number };
