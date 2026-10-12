// Oversize (OV, id 29) is a jumbo display card, not the regular collectible card.
// Price collectors must always discard listings containing this extra.
export const LIGA_IGNORED_EXTRA_IDS = new Set([29]);

export function resolveLigaCardIdentity(name: string, number: string, total: string, edition?: string, setName?: string) {
    // The classic anniversary catalogue uses sequential numbers; Liga uses
    // the original printed numbers for these cards.
    const classicAnniversary = edition === "30C-C" || /30.*(?:clássica|classica|classic)/i.test(setName ?? "");
    if (classicAnniversary && /^lugia$/i.test(name.trim()) && Number(total) === 30 && [29, 149].includes(Number(number))) {
        return { number: "149", total: "30", edition: "30C-C" };
    }
    if (classicAnniversary && /^charizard$/i.test(name.trim()) && Number(total) === 30 && [1, 4].includes(Number(number))) {
        return { number: "004", total: "30", edition: "30C-C" };
    }
    return { number, total, edition };
}

export function getLigaPokemonUrl(
    name: string,
    number: string,
    printedTotal: number,
    edition?: string,
    printedTotalLabel?: string,
    setName?: string
) {
    // A Liga diferencia códigos como 093/084 de 093/84. Como printedTotal é
    // numérico no catálogo, recompomos os zeros usando a largura do número da carta.
    const numericNumber = number.match(/^(\d+)(?:JP)?$/i);
    const prefixedNumber = number.match(/^([a-z]+)(\d+)$/i);
    const paddedTotal = printedTotalLabel ?? (prefixedNumber
        ? `${prefixedNumber[1]}${String(printedTotal).padStart(prefixedNumber[2].length, "0")}`
        : numericNumber
            ? String(printedTotal).padStart(numericNumber[1].length, "0")
            : String(printedTotal));
    // A coleção Perfect Order (Equilíbrio Perfeito na Liga) é cadastrada com
    // denominador 88, embora o catálogo global apresente 088.
    const usesUnpaddedTotal = /perfect order|equil[ií]brio perfeito/i.test(setName ?? "");
    const radiantTotal = paddedTotal.match(/^RC(\d+)$/i);
    const total = /^RC\d+/i.test(number) && radiantTotal
        ? radiantTotal[1].replace(/^0+(?=\d)/, "")
        : usesUnpaddedTotal
            ? String(printedTotal).replace(/^0+(?=\d)/, "")
            : paddedTotal;

    const identity = resolveLigaCardIdentity(name, number, total, edition, setName);
    const params = new URLSearchParams({
        view: "cards/card",
        card: `${name} (${identity.number}/${identity.total})`,
        num: identity.number,
    });

    if (identity.edition) params.set("ed", identity.edition);
    return `https://www.ligapokemon.com.br/?${params.toString()}`;
}
