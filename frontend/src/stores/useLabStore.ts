/**
 * Lab Store — Central state management for the physics lab workspace
 * Uses Zustand for lightweight, performant state outside React's render cycle.
 */
import { create } from 'zustand';
import type { BodyType, ConstraintType, RoomUser, Vec2 } from '@shared/types';

export type ToolMode =
  | 'select'
  | 'rectangle'
  | 'circle'
  | 'trapezoid'
  | 'spring'
  | 'rope'
  | 'pivot'
  | 'motor'
  | 'delete';

interface LabState {
  // Tool
  activeTool: ToolMode;
  setActiveTool: (tool: ToolMode) => void;

  // Selection
  selectedBodyId: string | null;
  setSelectedBodyId: (id: string | null) => void;

  // Room / multiplayer
  roomId: string | null;
  setRoomId: (id: string | null) => void;
  roomUsers: RoomUser[];
  setRoomUsers: (users: RoomUser[]) => void;
  addRoomUser: (user: RoomUser) => void;
  removeRoomUser: (userId: string) => void;
  updateUserCursor: (userId: string, cursor: Vec2) => void;

  // Simulation
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;

  // Connection
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;

  // Analytics panel
  showAnalytics: boolean;
  toggleAnalytics: () => void;
  trackedBodyId: string | null;
  setTrackedBodyId: (id: string | null) => void;

  // Constraint creation (two-click flow)
  constraintSourceId: string | null;
  setConstraintSourceId: (id: string | null) => void;

  // Experiment
  initialWorldState: any | null;
  setInitialWorldState: (state: any) => void;
}

export const useLabStore = create<LabState>((set) => ({
  activeTool: 'select',
  setActiveTool: (tool) => set({ activeTool: tool }),

  selectedBodyId: null,
  setSelectedBodyId: (id) => set({ selectedBodyId: id }),

  roomId: null,
  setRoomId: (id) => set({ roomId: id }),
  roomUsers: [],
  setRoomUsers: (users) => set({ roomUsers: users }),
  addRoomUser: (user) =>
    set((s) => ({
      roomUsers: s.roomUsers.some((u) => u.userId === user.userId)
        ? s.roomUsers
        : [...s.roomUsers, user],
    })),
  removeRoomUser: (userId) =>
    set((s) => ({
      roomUsers: s.roomUsers.filter((u) => u.userId !== userId),
    })),
  updateUserCursor: (userId, cursor) =>
    set((s) => ({
      roomUsers: s.roomUsers.map((u) =>
        u.userId === userId ? { ...u, cursor } : u
      ),
    })),

  isPlaying: false,
  setIsPlaying: (playing) => set({ isPlaying: playing }),

  isConnected: false,
  setIsConnected: (connected) => set({ isConnected: connected }),

  showAnalytics: true,
  toggleAnalytics: () => set((s) => ({ showAnalytics: !s.showAnalytics })),

  trackedBodyId: null,
  setTrackedBodyId: (id) => set({ trackedBodyId: id }),

  constraintSourceId: null,
  setConstraintSourceId: (id) => set({ constraintSourceId: id }),

  initialWorldState: null,
  setInitialWorldState: (state) => set({ initialWorldState: state }),
}));
