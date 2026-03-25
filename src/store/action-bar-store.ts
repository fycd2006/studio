import { create } from 'zustand';

interface ActionBarState {
  isNavbarVisible: boolean;
  setIsNavbarVisible: (visible: boolean) => void;
}

export const useActionBarStore = create<ActionBarState>((set) => ({
  isNavbarVisible: true,
  setIsNavbarVisible: (visible: boolean) => set({ isNavbarVisible: visible }),
}));
