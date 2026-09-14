import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type AuthMode = "login" | "signup";
export type AuthStatus = "idle" | "submitting" | "failed";

interface AuthState {
  mode: AuthMode;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  status: AuthStatus;
  error: string | null;
}

const initialState: AuthState = {
  mode: "login",
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  status: "idle",
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Switching modes clears the password fields (don't carry a typed
    // password across login/signup) and any stale error, but keeps
    // email/name so the person doesn't have to retype them.
    setAuthMode: (state, action: PayloadAction<AuthMode>) => {
      state.mode = action.payload;
      state.status = "idle";
      state.error = null;
      state.password = "";
      state.confirmPassword = "";
    },
    setName: (state, action: PayloadAction<string>) => {
      state.name = action.payload;
    },
    setEmail: (state, action: PayloadAction<string>) => {
      state.email = action.payload;
    },
    setPassword: (state, action: PayloadAction<string>) => {
      state.password = action.payload;
    },
    setConfirmPassword: (state, action: PayloadAction<string>) => {
      state.confirmPassword = action.payload;
    },
    loginStarted: (state) => {
      state.status = "submitting";
      state.error = null;
    },
    loginFailed: (state, action: PayloadAction<string>) => {
      state.status = "failed";
      state.error = action.payload;
    },
    signupStarted: (state) => {
      state.status = "submitting";
      state.error = null;
    },
    signupFailed: (state, action: PayloadAction<string>) => {
      state.status = "failed";
      state.error = action.payload;
    },
    clearAuthError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setAuthMode,
  setName,
  setEmail,
  setPassword,
  setConfirmPassword,
  loginStarted,
  loginFailed,
  signupStarted,
  signupFailed,
  clearAuthError,
} = authSlice.actions;
export default authSlice.reducer;