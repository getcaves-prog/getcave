import { create } from "zustand";

type PendingAction = { kind: "save-flyer"; flyerId: string };

interface PendingActionState {
  pending: PendingAction | null;
  authModalOpen: boolean;
  setPending: (action: PendingAction) => void;
  clearPending: () => void;
  closeModal: () => void;
}

export const usePendingActionStore = create<PendingActionState>((set) => ({
  pending: null,
  authModalOpen: false,

  setPending: (action) => set({ pending: action, authModalOpen: true }),
  clearPending: () => set({ pending: null }),
  closeModal: () => set({ authModalOpen: false }),
}));
