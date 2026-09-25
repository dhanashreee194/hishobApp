import {create} from 'zustand';

type AppState = {
  databaseReady: boolean;
  seedError: string | null;
  setDatabaseReady: (ready: boolean) => void;
  setSeedError: (message: string | null) => void;
};

export const useAppStore = create<AppState>(set => ({
  databaseReady: false,
  seedError: null,
  setDatabaseReady: databaseReady => set({databaseReady}),
  setSeedError: seedError => set({seedError}),
}));
