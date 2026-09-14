import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import navReducer from "./slices/navSlice";

export const store = configureStore({
    reducer: {
      auth: authReducer,
      nav: navReducer,
    }
  });

export type AppStore = typeof store;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];