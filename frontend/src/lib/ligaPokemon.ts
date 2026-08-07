export function getLigaPokemonUrl(
    name: string,
    number: string,
    printedTotal: number,
    edition?: string
) {
    const params = new URLSearchParams({
        view: "cards/card",
        card: `${name} (${number}/${printedTotal})`,
        num: number,
    });

    if (edition) params.set("ed", edition);
    return `https://www.ligapokemon.com.br/?${params.toString()}`;
}
