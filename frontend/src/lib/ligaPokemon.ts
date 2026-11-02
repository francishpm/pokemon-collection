// Oversize (OV, id 29) is a jumbo display card, not the regular collectible card.
// Price collectors must always discard listings containing this extra.
export const LIGA_IGNORED_EXTRA_IDS = new Set([29]);

export function resolveLigaCardIdentity(name: string, number: string, total: string, edition?: string, setName?: string): { name?: string; number: string; total: string; edition?: string; tipo?: string } {
    if (/perfect order|equil[ií]brio perfeito/i.test(setName ?? "") && Number(total) === 88) {
        return { number, total: "088", edition };
    }
    // This promo is indexed with an infinity denominator on Liga.
    if (/^teal mask ogerpon$/i.test(name.trim()) && Number(number) === 123 && (Number(total) === 225 || total === "∞")) {
        return { name: "Teal Mask Ogerpon", number: "123", total: "∞", tipo: "1" };
    }
    // The classic anniversary catalogue uses sequential numbers; Liga uses
    // the original printed numbers for these cards.
    const classicAnniversary = edition === "30C-C" || /30.*(?:clássica|classica|classic)/i.test(setName ?? "");
    if (classicAnniversary && /^pikachu\s+(?:e|&(?:amp;)?)\s+zekrom[ -]gx$/i.test(name.trim()) && Number(total) === 30 && [8, 33].includes(Number(number))) {
        // Liga's card URL retains the HTML entity in this card's name.
        return { name: "Pikachu &amp; Zekrom-GX", number: "033", total: "30", edition: "30C-C" };
    }
    if (classicAnniversary && /^magikarp$/i.test(name.trim()) && Number(total) === 30 && [30, 203].includes(Number(number))) {
        return { number: "203", total: "30", edition: "30C-C" };
    }
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
    const radiantTotal = paddedTotal.match(/^RC(\d+)$/i);
    const total = /^RC\d+/i.test(number) && radiantTotal
        ? radiantTotal[1].replace(/^0+(?=\d)/, "")
        : paddedTotal;

    const identity = resolveLigaCardIdentity(name, number, total, edition, setName);
    const params = new URLSearchParams({
        view: "cards/card",
        card: `${identity.name ?? name} (${identity.number}/${identity.total})`,
    });
    if (identity.tipo) params.set("tipo", identity.tipo);
    else params.set("num", identity.number);

    if (identity.edition) params.set("ed", identity.edition);
    return `https://www.ligapokemon.com.br/?${params.toString()}`;
}
