import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Group, GroupMessage } from '@/types';

interface GroupState {
  groups: Group[];
  activeGroups: Group[];
  myGroups: Group[];
  groupMessages: { [groupId: string]: GroupMessage[] };
  currentUserActiveGroupId?: Record<string, string | null>;
  userCreatedActivityId?: Record<string, string | null>; // Track user's created activity
  
  // Actions
  setGroups: (groups: Group[]) => void;
  addGroup: (group: Group) => void;
  updateGroup: (updated: Group) => void;
  joinGroup: (groupId: string, userId: string, name?: string, avatar?: string) => void;
  leaveGroup: (groupId: string, userId: string) => void;
  stopActivity: (groupId: string, creatorId: string) => void;
  updateUserAvatar: (userId: string, newAvatar: string) => void;
  setActiveGroups: (groups: Group[]) => void;
  addGroupMessage: (groupId: string, message: GroupMessage) => void;
  setGroupMessages: (groupId: string, messages: GroupMessage[]) => void;
  setMyGroups: (groups: Group[]) => void;
  createGroup: (groupData: {
    name: string;
    mood: string;
    emoji?: string;
    location: { latitude: number; longitude: number };
    distance: number;
    members: User[];
    maxMembers: number;
    createdBy: string;
    creatorName?: string;
    creatorAvatar?: string;
    isActive: boolean;
    isPublic: boolean;
    meetingLocation: string;
    expiresAt?: string;
  }) => Group;
  canUserCreateActivity: (userId: string) => boolean;
  removeUserCreatedActivity: (userId: string) => void;
}

export const useGroupStore = create<GroupState>()(
  persist(
    (set, get) => ({
      groups: [],
      activeGroups: [],
      groupMessages: {},
      myGroups: [],
      currentUserActiveGroupId: {},
      userCreatedActivityId: {},
      
      setGroups: (groups) => set({ groups }),
      
      addGroup: (group) => set((state) => ({
        groups: [...state.groups, group],
        activeGroups: group.isActive ? [...state.activeGroups, group] : state.activeGroups,
      })),
      
      updateGroup: (updated) => {
        set(state => ({
          groups: state.groups.map(g => g.id === updated.id ? { ...g, ...updated } : g),
          activeGroups: state.activeGroups.map(g => g.id === updated.id ? { ...g, ...updated } : g),
          myGroups: state.myGroups.map(g => g.id === updated.id ? { ...g, ...updated } : g),
        }));
      },
      
      joinGroup: (groupId, userId, name, avatar) => set((state) => {
        const activeMap = { ...(state.currentUserActiveGroupId || {}) };
        if (activeMap[userId] && activeMap[userId] !== groupId) {
          // user already in a different group — prevent join
          return {} as any;
        }
        const groups = state.groups.map(group => {
          if (group.id === groupId && group.members.length < group.maxMembers) {
            const isAlreadyMember = group.members.some(member => member.id === userId);
            if (!isAlreadyMember) {
              // Use real name and avatar
              const newMember = {
                id: userId,
                name: name || 'Current User',
                avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format',
                location: { latitude: 0, longitude: 0 },
                distance: 0,
                mood: 'chill',
                mutualFriends: 0,
                isOnline: true,
              };
              activeMap[userId] = groupId;
              return {
                ...group,
                members: [...group.members, newMember],
              };
            }
          }
          return group;
        });
        return { groups, activeGroups: groups.filter(group => group.isActive), currentUserActiveGroupId: activeMap };
      }),
      
      leaveGroup: (groupId, userId) => set((state) => {
        const groups = state.groups.map(group => {
          if (group.id === groupId) {
            return {
              ...group,
              members: group.members.filter(member => member.id !== userId),
            };
          }
          return group;
        });
        
        const activeMap = { ...(state.currentUserActiveGroupId || {}) };
        if (activeMap[userId] === groupId) activeMap[userId] = null;
        return { groups, activeGroups: groups.filter(group => group.isActive), myGroups: state.myGroups.filter(group => group.id !== groupId), currentUserActiveGroupId: activeMap };
      }),

      stopActivity: (groupId, creatorId) => set((state) => {
        // Completely remove the activity from all lists
        const groups = state.groups.filter(g => g.id !== groupId);
        const activeGroups = state.activeGroups.filter(g => g.id !== groupId);
        const myGroups = state.myGroups.filter(g => g.id !== groupId);
        
        // Clear creator's active group and created activity tracking
        const activeMap = { ...(state.currentUserActiveGroupId || {}) };
        if (activeMap[creatorId] === groupId) activeMap[creatorId] = null;
        
        const createdMap = { ...(state.userCreatedActivityId || {}) };
        if (createdMap[creatorId] === groupId) createdMap[creatorId] = null;
        
        return { 
          groups, 
          activeGroups, 
          myGroups, 
          currentUserActiveGroupId: activeMap,
          userCreatedActivityId: createdMap 
        };
      }),

      updateUserAvatar: (userId, newAvatar) => set((state) => {
        // Update avatar for this user in ALL groups where they're a member
        const updateMemberAvatar = (groups: Group[]) => 
          groups.map(group => ({
            ...group,
            members: group.members.map(member => 
              member.id === userId ? { ...member, avatar: newAvatar } : member
            )
          }));

        return {
          groups: updateMemberAvatar(state.groups),
          activeGroups: updateMemberAvatar(state.activeGroups),
          myGroups: updateMemberAvatar(state.myGroups),
        };
      }),
      
      setActiveGroups: (groups) => set({ activeGroups: groups }),
      
      addGroupMessage: (groupId, message) => set((state) => ({
        groupMessages: {
          ...state.groupMessages,
          [groupId]: [...(state.groupMessages[groupId] || []), message],
        },
      })),
      
      setGroupMessages: (groupId, messages) => set((state) => ({
        groupMessages: {
          ...state.groupMessages,
          [groupId]: messages,
        },
      })),
      
      setMyGroups: (groups) => set({ myGroups: groups }),
      
      createGroup: (groupData) => {
        // Check if creator is already a member
        const creatorId = groupData.createdBy;
        const existing = groupData.members.find(m => m.id === creatorId || m.email === creatorId);
        let creatorUser: User | undefined = existing;
        if (!creatorUser) {
          // Get the actual user from userStore via import
          // Since we can't import userStore here directly (circular dependency), 
          // we need the caller to pass the creator info
          // For now, use a fallback that will be replaced
          creatorUser = {
            id: creatorId,
            name: groupData.creatorName || 'Admin',
            avatar: groupData.creatorAvatar || 'https://ui-avatars.com/api/?name=Admin',
            location: { latitude: groupData.location.latitude, longitude: groupData.location.longitude },
            distance: 0,
            mood: groupData.mood,
            mutualFriends: 0,
            isOnline: true,
          };
        }
        const newGroup: Group = {
          ...groupData,
          members: [creatorUser, ...groupData.members.filter(m => m.id !== creatorUser!.id)],
          id: `group_${Date.now()}`,
          chatId: `chat_${Date.now()}`,
          createdAt: new Date().toISOString(),
          expiresAt: groupData.expiresAt || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          isActive: true,
        };
        set((state) => {
          const activeMap = { ...(state.currentUserActiveGroupId || {}) };
          activeMap[creatorId] = newGroup.id;
          const createdMap = { ...(state.userCreatedActivityId || {}) };
          createdMap[creatorId] = newGroup.id;
          return {
            groups: [...state.groups, newGroup],
            activeGroups: [...state.activeGroups, newGroup],
            myGroups: [...state.myGroups, newGroup],
            currentUserActiveGroupId: activeMap,
            userCreatedActivityId: createdMap,
          };
        });
        return newGroup;
      },

      canUserCreateActivity: (userId) => {
        const state = get();
        const createdActivityId = state.userCreatedActivityId?.[userId];
        if (!createdActivityId) return true;
        
        // Check if the created activity still exists and is not expired
        const activity = state.activeGroups.find(g => g.id === createdActivityId);
        if (!activity) {
          // Activity doesn't exist anymore, user can create new one
          return true;
        }
        
        const now = new Date();
        const expiry = new Date(activity.expiresAt);
        if (expiry <= now) {
          // Activity expired, user can create new one
          return true;
        }
        
        return false; // User still has an active activity
      },

      removeUserCreatedActivity: (userId) => {
        set((state) => {
          const createdMap = { ...(state.userCreatedActivityId || {}) };
          createdMap[userId] = null;
          return { userCreatedActivityId: createdMap };
        });
      },
    }),
    {
      name: 'group-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
