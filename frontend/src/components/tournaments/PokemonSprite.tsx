/* Sprites use PokeAPI's public asset repository, with static and offline fallbacks. */
"use client";
import { useState } from 'react';

export function PokemonSprite({ number, large = false }: { number: number; large?: boolean }) {
  const [failed, setFailed] = useState(0);
  const base = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
  const src = failed === 0 && number <= 649 ? `${base}/versions/generation-v/black-white/animated/${number}.gif` : `${base}/${number}.png`;
  if (failed >= 2) return <span aria-label={`Pokémon número ${number}`} className={large ? 'text-5xl' : 'text-xl'}>◉</span>;
  return <picture>
    <source media="(prefers-reduced-motion: reduce)" srcSet={`${base}/${number}.png`} />
    <img key={number} src={src} onError={() => setFailed(f => f + 1)} alt={`Pokémon #${number}`} width={large ? 160 : 48} height={large ? 160 : 48} className={large ? 'h-40 w-40 object-contain' : 'h-12 w-12 object-contain'} />
  </picture>;
}
