import { CollectionCard } from "@/types/collection-card";

const STORAGE_KEY = "carddex_collection";

export function getCards(): CollectionCard[] {
  if (typeof window === "undefined") {
    return [];
  }

  const data = window.localStorage.getItem(STORAGE_KEY);

  if (!data) {
    return [];
  }

  return JSON.parse(data);
}

export function saveCard(card: CollectionCard) {
  const cards = getCards();

  cards.push(card);

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(cards)
  );
}

export function deleteCard(id: string) {
  const cards = getCards().filter(
    (card) => card.id !== id
  );

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(cards)
  );
}

export function updateCard(card: CollectionCard) {
  const cards = getCards();

  const index = cards.findIndex(
    (item) => item.id === card.id
  );

  if (index === -1) return;

  cards[index] = card;

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(cards)
  );
}

export function clearCollection() {
  window.localStorage.removeItem(STORAGE_KEY);
}