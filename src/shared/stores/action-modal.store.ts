import { create } from "zustand";

interface ActionModalState {
  isOpen: boolean;
  initialView: "menu" | "upload" | "profile";
  open: (view?: "menu" | "upload" | "profile") => void;
  close: () => void;
}

export const useActionModalStore = create<ActionModalState>((set) => ({
  isOpen: false,
  initialView: "menu",
  open: (view = "menu") => set({ isOpen: true, initialView: view }),
  close: () => set({ isOpen: false, initialView: "menu" }),
}));
