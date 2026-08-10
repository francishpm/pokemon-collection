-- Serve promo images from this application instead of relying on external hotlinks.
update public.master_set_catalog
set image_url = '/cards/mep/' || lpad(card_number, 3, '0') || '.webp'
where set_id = 'mep'
  and card_number ~ '^[0-9]+$'
  and card_number::integer between 1 and 110;
