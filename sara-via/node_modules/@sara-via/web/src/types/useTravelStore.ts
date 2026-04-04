import { create } from 'zustand';

interface TravelStore {
  destination: string;
  budgetPi: number;
  travelers: number;
  checkIn: string;
  checkOut: string;
  setBookingData: (payload: Partial<Omit<TravelStore, 'setBookingData'>>) => void;
}

export const useTravelStore = create<TravelStore>((set) => ({
  destination: 'Paris',
  budgetPi: 500,
  travelers: 2,
  checkIn: '2026-06-15',
  checkOut: '2026-06-20',
  setBookingData: (payload) => set((state) => ({ ...state, ...payload }))
}));
