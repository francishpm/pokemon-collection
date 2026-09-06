import { PokemonCard } from "@/types/pokemon-card";
import { getCardById } from "./pokemonApi";

const STORAGE_KEY = "colecionadex_pokemon_cache";

type PokemonCache = Record<string, PokemonCard>;

function getCache(): PokemonCache {
    if (typeof window === "undefined") {
        return {};
    }

    let cache: string | null;
    try {
        cache = window.localStorage.getItem(STORAGE_KEY);
    } catch {
        return {};
    }

    if (!cache) {
        return {};
    }

    try {
        const parsed: unknown = JSON.parse(cache);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? parsed as PokemonCache
            : {};
    } catch {
        try {
            window.localStorage.removeItem(STORAGE_KEY);
        } catch {
            // The app remains usable when browser storage is unavailable.
        }
        return {};
    }
}

function saveCache(cache: PokemonCache) {
    try {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(cache)
        );
    } catch {
        // Cache is optional; Supabase remains the source of truth.
    }
}

export async function getPokemonCached(
    id: string
): Promise<PokemonCard | null> {
    const cache = getCache();

    if (cache[id]) {
        return cache[id];
    }

    const pokemon = await getCardById(id);

    if (!pokemon) {
        return null;
    }

    cache[id] = pokemon;

    saveCache(cache);

    return pokemon;
}

export function savePokemonInCache(card: PokemonCard) {
    const cache = getCache();

    cache[card.id] = card;

    saveCache(cache);
}
