import { create } from 'zustand';

interface DiseaseState {
  diseaseId: string | null;
  predictionResults: any | null;
  setDiseaseId: (id: string | null) => void;
  setPredictionResults: (results: any | null) => void;
  clearResults: () => void;
}

export const useDiseaseStore = create<DiseaseState>((set) => ({
  diseaseId: null,
  predictionResults: null,
  setDiseaseId: (id) => set({ diseaseId: id }),
  setPredictionResults: (results) => set({ predictionResults: results }),
  clearResults: () => set({ diseaseId: null, predictionResults: null }),
}));
