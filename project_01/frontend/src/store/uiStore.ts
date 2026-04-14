import { create } from 'zustand';

interface UIStore {
  isLoading: boolean;
  loadingTip: string;
  setIsLoading: (isLoading: boolean, tip?: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isLoading: false,
  loadingTip: '加载中...',
  setIsLoading: (isLoading, tip = '加载中...') => set({ isLoading, loadingTip: tip }),
}));
