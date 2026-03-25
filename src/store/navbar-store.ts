import { create } from 'zustand';

interface NavbarState {
  isVisible: boolean;
  isScrolled: boolean;
  setIsVisible: (visible: boolean) => void;
  setIsScrolled: (scrolled: boolean) => void;
}

export const useNavbarStore = create<NavbarState>((set) => ({
  isVisible: true,
  isScrolled: false,
  setIsVisible: (visible: boolean) => set({ isVisible: visible }),
  setIsScrolled: (scrolled: boolean) => set({ isScrolled: scrolled }),
}));
