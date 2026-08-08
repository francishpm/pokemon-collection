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
    const total = usesUnpaddedTotal
        ? String(printedTotal).replace(/^0+(?=\d)/, "")
        : paddedTotal;

    const params = new URLSearchParams({
        view: "cards/card",
        card: `${name} (${number}/${total})`,
        num: number,
    });

    if (edition) params.set("ed", edition);
    return `https://www.ligapokemon.com.br/?${params.toString()}`;
}
