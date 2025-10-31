import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  fullName: string;
  email: string;
  gender: string;
  dateOfBirth?: string; // Date of birth for user profile
  isEmailVerified: boolean;
  isPhotoVerified: boolean;
  instagramUsername?: string;
  avatar?: string; // NEW: profile avatar uri
  hasCompletedOnboarding?: boolean; // NEW: track if user completed onboarding
}

interface UserState {
  profile: UserProfile | null;
  loginEmail: string | null;
  isAvailable: boolean;
  availableUntil: string | null;
  currentMood: string;
  selectedMood: string | null;
  visibleTo: 'friends' | 'everyone';
  location: { latitude: number; longitude: number } | null;
  instagramConnected: boolean;
  maxAgeDifference: number; // NEW
  setProfile: (profile: UserProfile) => void;
  setLoginEmail: (email: string) => void;
  setProfileAvatar: (avatar: string) => void; // NEW
  updateEmailVerification: (verified: boolean) => void;
  updatePhotoVerification: (verified: boolean) => void;
  updateInstagramConnection: (username: string) => void;
  setAvailable: (status: boolean) => void;
  setMood: (mood: string) => void;
  setSelectedMood: (mood: string | null) => void;
  setVisibleTo: (visibility: 'friends' | 'everyone') => void;
  setLocation: (location: { latitude: number; longitude: number } | null) => void;
  setInstagramConnected: (connected: boolean) => void;
  setMaxAgeDifference: (diff: number) => void; // NEW
  setOnboardingCompleted: (completed: boolean) => void; // NEW
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      profile: null,
      loginEmail: null,
      isAvailable: false,
      availableUntil: null,
      currentMood: 'all',
      selectedMood: null,
      visibleTo: 'friends',
      location: null,
      instagramConnected: false,
      maxAgeDifference: 5, // NEW
      setProfile: (profile) => set({ profile }),
      setLoginEmail: (email) => set({ loginEmail: email }),
      setProfileAvatar: (avatar) => set((state) => ({
        profile: state.profile ? { ...state.profile, avatar } : { fullName: 'User', email: state.loginEmail || 'user@example.com', gender: '', isEmailVerified: false, isPhotoVerified: false, avatar }
      })),
      updateEmailVerification: (verified) => set((state) => ({
        profile: state.profile ? { ...state.profile, isEmailVerified: verified } : null
      })),
      updatePhotoVerification: (verified) => set((state) => ({
        profile: state.profile ? { ...state.profile, isPhotoVerified: verified } : null
      })),
      updateInstagramConnection: (username) => set((state) => ({
        profile: state.profile ? { ...state.profile, instagramUsername: username } : null,
        instagramConnected: true
      })),
      setAvailable: (status) => set((state) => {
        if (status) {
          const expiryTime = new Date();
          expiryTime.setHours(expiryTime.getHours() + 2);
          return { isAvailable: true, availableUntil: expiryTime.toISOString() };
        } else {
          return { isAvailable: false, availableUntil: null };
        }
      }),
      setMood: (mood) => set({ currentMood: mood }),
      setSelectedMood: (mood) => set({ selectedMood: mood }),
      setVisibleTo: (visibility) => set({ visibleTo: visibility }),
      setLocation: (location) => set({ location }),
      setInstagramConnected: (connected) => set({ instagramConnected: connected }),
      setMaxAgeDifference: (diff) => set({ maxAgeDifference: diff }),
      setOnboardingCompleted: (completed) => set((state) => ({
        profile: state.profile ? { ...state.profile, hasCompletedOnboarding: completed } : null
      })),
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);