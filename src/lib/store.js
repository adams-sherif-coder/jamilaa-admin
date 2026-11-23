import { configureStore, createSlice } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { api } from "./api";
const session = createSlice({
  name: "session",
  initialState: { expired: false },
  reducers: {
    expired: (state) => {
      state.expired = true;
    },
    restored: (state) => {
      state.expired = false;
    },
  },
});
export const store = configureStore({
  reducer: { api: api.reducer, session: session.reducer },
  middleware: (getDefault) => getDefault().concat(api.middleware),
});
setupListeners(store.dispatch);
