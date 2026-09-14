import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type UserRole = "teacher" | "student";
export type OpenPanel = "none" | "notifications" | "profile" | "mobileMenu";

interface NavState {
  openPanel: OpenPanel;
  role: UserRole;
  unreadNotifications: number;
}

// `role` stands in for the session role until better-auth is wired up to
// this component — swap the initial value / setRole calls for real session
// data once auth lands.
const initialState: NavState = {
  openPanel: "none",
  role: "teacher",
  unreadNotifications: 3,
};

const navSlice = createSlice({
  name: "nav",
  initialState,
  reducers: {
    // Opening a panel that's already open closes it — keeps exactly one
    // of {notifications, profile, mobileMenu} open at a time for free,
    // since they all live in this single field.
    togglePanel: (state, action: PayloadAction<OpenPanel>) => {
      state.openPanel = state.openPanel === action.payload ? "none" : action.payload;
    },
    closePanel: (state) => {
      state.openPanel = "none";
    },
    setRole: (state, action: PayloadAction<UserRole>) => {
      state.role = action.payload;
      state.openPanel = "none";
    },
    clearNotifications: (state) => {
      state.unreadNotifications = 0;
    },
  },
});

export const { togglePanel, closePanel, setRole, clearNotifications } = navSlice.actions;
export default navSlice.reducer;