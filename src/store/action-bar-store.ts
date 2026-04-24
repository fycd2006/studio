import { create } from 'zustand';

interface ActionBarState {
  isNavbarVisible: boolean;
  setIsNavbarVisible: (visible: boolean) => void;
  hasActionBar: boolean;
  setHasActionBar: (has: boolean) => void;
  /** When true, bottom tab bar hides and top navbar auto-hides on scroll */
  isFullscreen: boolean;
  setIsFullscreen: (fs: boolean) => void;
}

export const useActionBarStore = create<ActionBarState>((set) => ({
  isNavbarVisible: true,
  setIsNavbarVisible: (visible: boolean) => set({ isNavbarVisible: visible }),
  hasActionBar: false,
  setHasActionBar: (has: boolean) => set({ hasActionBar: has }),
  isFullscreen: false,
  setIsFullscreen: (fs: boolean) => set({ isFullscreen: fs }),
}));
