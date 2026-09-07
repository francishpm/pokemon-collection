-- The localized Scarlet & Violet metadata can point to image files that do not
-- exist under /pt/. Card artwork is language-independent in the TCGdex assets,
-- so use the complete English image mirror while retaining localized metadata.
update public.master_set_catalog
set image_url = regexp_replace(
  image_url,
  '^https://assets\.tcgdex\.net/pt/sv/',
  'https://assets.tcgdex.net/en/sv/'
)
where (set_id like 'sv%' or set_id in ('svp', 'sve'))
  and image_url like 'https://assets.tcgdex.net/pt/sv/%';

update public.master_set_catalog
set image_url = case
  when card_number::integer <= 16 then
    'https://images.pokemontcg.io/sve/' || card_number::integer || '_hires.png'
  else
    'https://pkmncards.com/wp-content/uploads/sve_en_' || lpad(card_number, 3, '0') || '_std.png'
end
where set_id = 'sve';
