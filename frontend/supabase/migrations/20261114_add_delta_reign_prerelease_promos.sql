-- Four stamped Portuguese prerelease promos; keep regular me06 cards separate.
begin;
insert into public.master_set_catalog (set_id,card_id,variant,card_number,card_name,image_url,rarity,sort_order) values
('mep','mep-111','holo','111','Masquerain','/cards/mep/111.png','Promo',1110),
('mep','mep-112','holo','112','Magmortar','/cards/mep/112.png','Promo',1120),
('mep','mep-113','holo','113','Enamorus','/cards/mep/113.png','Promo',1130),
('mep','mep-114','holo','114','Kommo-o','/cards/mep/114.png','Promo',1140)
on conflict (set_id,card_id,variant) do update set card_number=excluded.card_number,card_name=excluded.card_name,image_url=excluded.image_url,rarity=excluded.rarity,sort_order=excluded.sort_order;
commit;
