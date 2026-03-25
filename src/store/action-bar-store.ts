import { create } from 'zustand';

interface ActionBarState {
  isNavbarVisible: boolean;
  setIsNavbarVisible: (visible: boolean) => void;
  hasActionBar: boolean;
  setHasActionBar: (has: boolean) => void;
}

export const useActionBarStore = create<ActionBarState>((set) => ({
  isNavbarVisible: true,
  setIsNavbarVisible: (visible: boolean) => set({ isNavbarVisible: visible }),
  hasActionBar: false,
  setHasActionBar: (has: boolean) => set({ hasActionBar: has }),
}));
