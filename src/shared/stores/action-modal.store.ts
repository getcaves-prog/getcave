import { create } from "zustand";

interface ActionModalState {
  isOpen: boolean;
  initialView: "menu" | "upload" | "profile";
  /** Optional community to preselect when opening the upload flow from a community page. */
  preselectedCommunityId: string | null;
  open: (view?: "menu" | "upload" | "profile", communityId?: string | null) => void;
  close: () => void;
}

export const useActionModalStore = create<ActionModalState>((set) => ({
  isOpen: false,
  initialView: "menu",
  preselectedCommunityId: null,
  open: (view = "menu", communityId = null) =>
    set({ isOpen: true, initialView: view, preselectedCommunityId: communityId }),
  close: () => set({ isOpen: false, initialView: "menu", preselectedCommunityId: null }),
}));
