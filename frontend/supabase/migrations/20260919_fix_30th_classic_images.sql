-- Use the verified Portuguese card images bundled with the app.
update public.master_set_catalog
set image_url = '/cards/30th-c/' || lpad(card_number, 3, '0') || '.webp'
where set_id = '30th-c';
