import { create } from 'zustand';
import { 
  BrandDetails, 
  GeneratedAd, 
  GeneratedCopy, 
  GeneratedVideo, 
  GeneratedPhotoshoot, 
  CreativeScoreResult, 
  AppStats,
  ToastMessage
} from '../types';

interface AppState {
  currentSection: string;
  brandDetails: BrandDetails;
  generatedAds: GeneratedAd[];
  generatedCopies: GeneratedCopy[];
  generatedVideos: GeneratedVideo[];
  generatedPhotoshoots: GeneratedPhotoshoot[];
  creativeScores: CreativeScoreResult[];
  stats: AppStats;
  isFalJobRunning: boolean;
  toasts: ToastMessage[];
  
  // Actions
  setSection: (section: string) => void;
  updateBrandDetails: (details: Partial<BrandDetails>) => void;
  addAd: (ad: GeneratedAd) => void;
  updateAdScore: (adId: string, score: number) => void;
  addCopy: (copy: GeneratedCopy) => void;
  toggleCopyFeedback: (copyId: string, type: 'up' | 'down') => void;
  addVideo: (video: GeneratedVideo) => void;
  addPhotoshoot: (photoshoot: GeneratedPhotoshoot) => void;
  addCreativeScore: (score: CreativeScoreResult) => void;
  setFalJobRunning: (running: boolean) => void;
  clearAllDownloads: () => void;
  
  // Toast actions
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

const DEFAULT_BRAND_DETAILS: BrandDetails = {
  brandName: '',
  industry: 'E-commerce',
  brandColor: '#111111',
  brandLogo: null,
};

const DEFAULT_STATS: AppStats = {
  adsGenerated: 0,
  copiesWritten: 0,
  videosCreated: 0,
  photoshootsDone: 0,
};

// Helper to save to local storage with size capping (50 items)
function saveToLocalStorage<T>(key: string, items: T[]) {
  if (typeof window === 'undefined') return;
  const capped = items.slice(-50); // Keep last 50 items
  localStorage.setItem(key, JSON.stringify(capped));
}

function loadFromLocalStorage<T>(key: string, defaultValue: T[]): T[] {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    console.error(`Failed to load key ${key} from localStorage`, e);
    return defaultValue;
  }
}

export const useAppStore = create<AppState>((set, get) => {

  return {
    currentSection: 'dashboard',
    brandDetails: DEFAULT_BRAND_DETAILS,
    generatedAds: [],
    generatedCopies: [],
    generatedVideos: [],
    generatedPhotoshoots: [],
    creativeScores: [],
    stats: DEFAULT_STATS,
    isFalJobRunning: false,
    toasts: [],

    setSection: (section) => set({ currentSection: section }),
    
    updateBrandDetails: (details) => set((state) => {
      const updated = { ...state.brandDetails, ...details };
      if (typeof window !== 'undefined') {
        localStorage.setItem('adcreative_brand', JSON.stringify(updated));
      }
      return { brandDetails: updated };
    }),

    addAd: (ad) => set((state) => {
      const updatedAds = [ad, ...state.generatedAds].slice(0, 50);
      const updatedStats = { ...state.stats, adsGenerated: state.stats.adsGenerated + 1 };
      
      saveToLocalStorage('adcreative_ads', updatedAds);
      if (typeof window !== 'undefined') {
        localStorage.setItem('adcreative_stats', JSON.stringify(updatedStats));
      }
      return { generatedAds: updatedAds, stats: updatedStats };
    }),

    updateAdScore: (adId, score) => set((state) => {
      const updatedAds = state.generatedAds.map(ad => 
        ad.id === adId ? { ...ad, score } : ad
      );
      saveToLocalStorage('adcreative_ads', updatedAds);
      return { generatedAds: updatedAds };
    }),

    addCopy: (copy) => set((state) => {
      const updatedCopies = [copy, ...state.generatedCopies].slice(0, 50);
      const updatedStats = { ...state.stats, copiesWritten: state.stats.copiesWritten + 1 };
      
      saveToLocalStorage('adcreative_copies', updatedCopies);
      if (typeof window !== 'undefined') {
        localStorage.setItem('adcreative_stats', JSON.stringify(updatedStats));
      }
      return { generatedCopies: updatedCopies, stats: updatedStats };
    }),

    toggleCopyFeedback: (copyId, type) => set((state) => {
      const updatedCopies = state.generatedCopies.map((copy) => {
        if (copy.id !== copyId) return copy;
        if (type === 'up') {
          return { ...copy, thumbsUp: !copy.thumbsUp, thumbsDown: false };
        } else {
          return { ...copy, thumbsDown: !copy.thumbsDown, thumbsUp: false };
        }
      });
      saveToLocalStorage('adcreative_copies', updatedCopies);
      return { generatedCopies: updatedCopies };
    }),

    addVideo: (video) => set((state) => {
      const updatedVideos = [video, ...state.generatedVideos].slice(0, 50);
      const updatedStats = { ...state.stats, videosCreated: state.stats.videosCreated + 1 };
      
      saveToLocalStorage('adcreative_videos', updatedVideos);
      if (typeof window !== 'undefined') {
        localStorage.setItem('adcreative_stats', JSON.stringify(updatedStats));
      }
      return { generatedVideos: updatedVideos, stats: updatedStats };
    }),

    addPhotoshoot: (photoshoot) => set((state) => {
      const updatedPhotoshoots = [photoshoot, ...state.generatedPhotoshoots].slice(0, 50);
      const updatedStats = { ...state.stats, photoshootsDone: state.stats.photoshootsDone + 1 };
      
      saveToLocalStorage('adcreative_photoshoots', updatedPhotoshoots);
      if (typeof window !== 'undefined') {
        localStorage.setItem('adcreative_stats', JSON.stringify(updatedStats));
      }
      return { generatedPhotoshoots: updatedPhotoshoots, stats: updatedStats };
    }),

    addCreativeScore: (score) => set((state) => {
      const updatedScores = [score, ...state.creativeScores].slice(0, 50);
      saveToLocalStorage('adcreative_scores', updatedScores);
      return { creativeScores: updatedScores };
    }),

    setFalJobRunning: (running) => set({ isFalJobRunning: running }),

    clearAllDownloads: () => set(() => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('adcreative_ads');
        localStorage.removeItem('adcreative_copies');
        localStorage.removeItem('adcreative_videos');
        localStorage.removeItem('adcreative_photoshoots');
        localStorage.removeItem('adcreative_scores');
        localStorage.removeItem('adcreative_stats');
      }
      return {
        generatedAds: [],
        generatedCopies: [],
        generatedVideos: [],
        generatedPhotoshoots: [],
        creativeScores: [],
        stats: DEFAULT_STATS,
      };
    }),

    addToast: (message, type = 'info') => set((state) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = { id, message, type };
      
      // Auto remove after 4 seconds
      setTimeout(() => {
        get().removeToast(id);
      }, 4000);

      return { toasts: [...state.toasts, newToast] };
    }),

    removeToast: (id) => set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    })),
  };
});
