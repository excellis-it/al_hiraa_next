import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
}

const stored = localStorage.getItem('auth');
const parsed = stored ? JSON.parse(stored) : null;

const initialState: AuthState = {
  user: parsed?.user || null,
  token: parsed?.token || null,
  refreshToken: parsed?.refreshToken || null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; access_token: string; refresh_token: string }>,
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.access_token;
      state.refreshToken = action.payload.refresh_token;
      localStorage.setItem(
        'auth',
        JSON.stringify({
          user: action.payload.user,
          token: action.payload.access_token,
          refreshToken: action.payload.refresh_token,
        }),
      );
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      localStorage.removeItem('auth');
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
