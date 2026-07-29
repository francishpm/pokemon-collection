"use client";

import { useEffect, useMemo, useState } from "react";

import { PokemonCard } from "@/types/pokemon-card";
import { CollectionCard as CollectionCardType } from "@/types/collection-card";

import { searchCards } from "@/services/pokemonApi";

interface CardSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CardSearchDialog({
  open,
  onOpenChange,
}: CardSearchDialogProps) {

  const [search, setSearch] = useState("");

  const [apiCards, setApiCards] = useState<PokemonCard[]>([]);

  const [loading, setLoading] = useState(false);

  const [selectedCard, setSelectedCard] =
    useState<PokemonCard | null>(null);

  const [editingCard, setEditingCard] =
    useState<CollectionCardType | null>(null);

  const [openAddDialog, setOpenAddDialog] =
    useState(false);

  return null;
}