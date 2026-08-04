import { create } from "zustand";

interface UiState {
  isSearchModalOpen: boolean;
  modalTarget: "collection" | "wishlist" | "trades"; // Adicionado "trades"
  openSearchModal: (target?: "collection" | "wishlist" | "trades") => void;
  closeSearchModal: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isSearchModalOpen: false,
  modalTarget: "collection",
  openSearchModal: (target = "collection") => set({ isSearchModalOpen: true, modalTarget: target }),
  closeSearchModal: () => set({ isSearchModalOpen: false }),
}));