/** Extract hints, never a definitive identity, from the title and footer OCR. */
export function parseScannedCard(title: string, footer: string) {
  // A single digit on each side is usually an OCR fragment, not a reliable identity.
  const numbered = [...footer.matchAll(/\b([A-Z]{0,3}\d{1,4}[A-Z]?)\s*\/\s*([A-Z]{0,3}\d{1,4})\b/gi)]
    .find((match) => Number(match[2].replace(/\D/g, "")) >= 10 && Number(match[1].replace(/\D/g, "")) > 0);
  const promo = footer.match(/\b((?:SVP|SWSH|SM|XY|BW)\s*\d{1,4})\b/i);
  const number = numbered
    ? `${numbered[1]}/${numbered[2]}`.toUpperCase()
    : promo?.[1].replace(/\s/g, "").toUpperCase() ?? "";

  const lines = title.split(/\n/).map((line) => line
    .replace(/\b(?:HP|PS|PV)\s*\d+.*$/i, "")
    .replace(/\b\d+\s*(?:HP|PS|PV)\b.*$/i, "")
    .replace(/\b\d+\s*(?:H|P)?\s*$/i, "")
    .replace(/^(?:BASIC|BÁSICO|BASICO|ESTÁGIO\s*\d|STAGE\s*\d)\s*/i, "")
    .replace(/[^\p{L}\p{N}\s.'’♀♂-]/gu, " ")
    .replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 3 && /\p{L}/u.test(line)
      && !/^(?:ágio|agio|stágio|stagio|evolui|evolves|put|coloque|pokémon|pokemon|nintendo|creatures|game freak|treinador|trainer|energia|energy|estágio|stage|básico|basic)\b/i.test(line));
  return { name: lines.find((line) => !/copyright|nintendo|creatures|game\s*fre|\b20\d{2}\b/i.test(line)) ?? "", number };
}

export function scannedCardQuery(name: string, number: string) {
  const cleanName = name.trim().replace(/\s+/g, " ");
  let cleanNumber = number.replace(/\s+/g, "");
  if (cleanNumber && !/^[a-z]*\d+[a-z]*(?:\/[a-z]*\d+)?$/i.test(cleanNumber)) {
    throw new Error("Confira o número da carta. Exemplo: 025/165 ou TG01/TG30.");
  }
  if (!cleanNumber && cleanName.length < 3) {
    throw new Error("Informe o nome ou o número da carta para pesquisar.");
  }
  // Gallery totals vary across catalogs; the prefixed card number identifies the subset.
  if (/^[a-z]+\d+\/[a-z]+\d+$/i.test(cleanNumber)) cleanNumber = cleanNumber.split("/")[0];
  return [cleanName, cleanNumber].filter(Boolean).join(" ");
}

/** Correct only a unique, very close species spelling; never infer the card edition. */
export function correctScannedName(name: string, species: string[]) {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const source = normalize(name);
  if (source.length < 6) return name;
  function distance(a: string, b: string) {
    let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let row = 1; row <= a.length; row++) {
      const current = [row];
      for (let col = 1; col <= b.length; col++) current[col] = Math.min(current[col - 1] + 1, previous[col] + 1, previous[col - 1] + (a[row - 1] === b[col - 1] ? 0 : 1));
      previous = current;
    }
    return previous[b.length];
  }
  const matches = species.filter((item) => Math.abs(normalize(item).length - source.length) <= 1)
    .map((item) => ({ name: item, distance: distance(source, normalize(item)) }))
    .filter((item) => item.distance <= 1).sort((a, b) => a.distance - b.distance);
  if (matches[0]?.distance === 0) return matches[0].name;
  return matches.length === 1 ? matches[0].name : name;
}

export interface ScannedNumberReading { number: string; confidence: number }

export function selectScannedNumber(segments: { text: string; confidence: number }[]) {
  const readings = new Map<string, ScannedNumberReading>();
  for (const segment of segments) {
    const number = parseScannedCard("", segment.text).number;
    if (!number || !Number.isFinite(segment.confidence)) continue;
    const previous = readings.get(number);
    if (!previous || previous.confidence < segment.confidence) readings.set(number, { number, confidence: segment.confidence });
  }
  const candidates = [...readings.values()].sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  const best = candidates[0];
  const certain = best && best.confidence >= 35 && (!candidates[1] || best.confidence - candidates[1].confidence >= 15);
  return { number: certain ? best.number : "", candidates };
}
