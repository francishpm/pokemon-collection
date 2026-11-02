# Prize Pack catalogue

Snapshot: 2026-11-01. 874 consultable records, including separate TCGplayer
print variants (Cosmos Holo, Left Stamp and Right Stamp). Sealed boosters and
online code cards are excluded. Language is English: no other language is inferred.

- Products and stamped product photographs: https://tcgcsv.com/tcgplayer/3/22880/products
- Product source links in each record point to TCGplayer.
- Series membership and coverage: https://tcgpromos.com/pokemon-prize-pack-series-cards
  (735 distinct checklist entries across series 1–9).
- Official checklists: https://www.pokemon.com/static-assets/content-assets/cms2/pdf/trading-card-game/checklist/prize_pack_series_9_web_cardlist_en.pdf
  (substitute series number 1–9).

The importer matches name and printed number before assigning series. It retains
all source product variants, plus a clearly marked image-unavailable entry for
Rillaboom 014/202 (series 1). TCGplayer lists a Rillaboom 014/072 instead; these
records are intentionally separate until their correspondence is verified.
Basic Energy MEE numbers are read from the product title because the product
Number field omits the MEE prefix. Unnumbered energies remain unnumbered.
No stamped image is generated or overlaid onto a normal card.

Refresh from the frontend directory: `node scripts/import-prize-packs.mjs`.
The script validates minimum source sizes and writes an audit to
`outputs/prize-audit.json`. Review that audit and the imported diff before release.
Releases after this snapshot require a catalogue refresh; the catalogue is local
and remains searchable when upstream services are unavailable.

Prize Packs have separate IDs and carry series and finish in the set label so
trade snapshots remain distinct without requiring a database migration.
Automatic Liga pricing is excluded because ordinary print prices do not verify
the Play! Pokémon stamp. Product pages remain available for manual consultation.
