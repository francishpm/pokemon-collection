export function getLigaPokemonUrl(
    name: string,
    number: string,
    printedTotal: number,
    edition: string
) {
    return `https://www.ligapokemon.com.br/?view=cards/card&card=${encodeURIComponent(
        `${name} (${number}/${printedTotal})`
    )}&ed=${edition}&num=${number}`;
}