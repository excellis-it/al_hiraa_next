import { apiSlice } from './apiSlice';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  user: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  };
  access_token: string;
  refresh_token: string;
}

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    refreshToken: builder.mutation<{ access_token: string; refresh_token: string }, { refresh_token: string }>({
      query: (body) => ({
        url: '/auth/refresh-token',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useLoginMutation, useRefreshTokenMutation } = authApi;
