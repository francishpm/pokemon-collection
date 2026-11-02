export function cardImageSources(sources: string[]) {
  const candidates: string[] = [];
  for (const source of sources.filter(Boolean)) {
    const variants = [source];
    if (/^https:\/\/assets\.tcgdex\.net\//.test(source)) {
      variants.unshift(source.replace(/\/high\.webp$/, "/low.webp"));
      variants.push(...variants.map((url) => url.replace("/pt/", "/en/")));
    }
    for (const url of variants) {
      candidates.push(url);
      if (/^https:\/\/(?:assets\.tcgdex\.net|images\.pokemontcg\.io|images\.scrydex\.com|repositorio\.sbrauble\.com|tcgplayer-cdn\.tcgplayer\.com)\//.test(url)) {
        candidates.push(`/api/cards/image?url=${encodeURIComponent(url)}`);
      }
    }
    // These Sword & Shield set IDs are shared by both image catalogues.
    // Restrict the mapping to known sets so a different printing is never guessed.
    const swsh = source.match(/^https:\/\/assets\.tcgdex\.net\/en\/swsh\/(swsh(?:[1-9]|1[0-2])(?:tg)?)\/(\d+|TG\d+)\/(?:low|high)\.webp$/i);
    if (swsh) {
      const number = /^\d+$/.test(swsh[2]) ? String(Number(swsh[2])) : swsh[2].toUpperCase();
      const alternative = `https://images.pokemontcg.io/${swsh[1].toLowerCase()}/${number}.png`;
      candidates.push(alternative, `/api/cards/image?url=${encodeURIComponent(alternative)}`);
    }
  }
  return [...new Set(candidates)];
}
