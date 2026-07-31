"use client";

import { CardSearchDialog } from "@/components/collection/CardSearchDialog";
import { useUiStore } from "@/store/uiStore";

export function GlobalModals() {
  const { isSearchModalOpen, closeSearchModal } = useUiStore();

  return (
    <CardSearchDialog
      open={isSearchModalOpen}
      onOpenChange={(open) => {
        if (!open) closeSearchModal();
      }}
    />
  );
}