import { PokemonCard } from "@/types/pokemon-card";
import { getCardById } from "./pokemonApi";

const STORAGE_KEY = "carddex_pokemon_cache";

type PokemonCache = Record<string, PokemonCard>;

function getCache(): PokemonCache {
    if (typeof window === "undefined") {
        return {};
    }

    const cache = window.localStorage.getItem(STORAGE_KEY);

    if (!cache) {
        return {};
    }

    return JSON.parse(cache);
}

function saveCache(cache: PokemonCache) {
    window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(cache)
    );
}

export async function getPokemonCached(
    id: string
): Promise<PokemonCard | null> {
    console.time(id);
    const cache = getCache();

    if (cache[id]) {
        console.timeEnd(id);
        return cache[id];
    }

    console.log("API:", id);
    const pokemon = await getCardById(id);

    if (!pokemon) {
        return null;
    }

    cache[id] = pokemon;

    saveCache(cache);

    console.timeEnd(id);

    return pokemon;
}

export function savePokemonInCache(card: PokemonCard) {
    const cache = getCache();

    cache[card.id] = card;

    saveCache(cache);
}