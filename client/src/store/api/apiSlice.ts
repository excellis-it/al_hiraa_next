import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { RootState } from '../store';
import { setCredentials, logout } from '../slices/authSlice';

const baseQuery = fetchBaseQuery({
  baseUrl: '/api',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Single-flight refresh: if many requests 401 at once, only one refresh fires.
let refreshPromise: Promise<Awaited<ReturnType<typeof baseQuery>>> | null = null;

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error?.status !== 401) return result;

  const state = api.getState() as RootState;
  const refreshToken = state.auth.refreshToken;
  const user = state.auth.user;

  if (!refreshToken || !user) {
    api.dispatch(logout());
    return result;
  }

  if (!refreshPromise) {
    refreshPromise = baseQuery(
      { url: '/auth/refresh-token', method: 'POST', body: { refresh_token: refreshToken } },
      api,
      extraOptions,
    );
  }

  const refreshResult = await refreshPromise;
  refreshPromise = null;

  const data = refreshResult.data as { access_token: string; refresh_token: string } | undefined;
  if (!data?.access_token) {
    api.dispatch(logout());
    return result;
  }

  api.dispatch(
    setCredentials({
      user,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    }),
  );

  return baseQuery(args, api, extraOptions);
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Candidates', 'Users', 'Trades', 'States', 'Cities', 'Sources', 'Dashboard', 'Companies', 'Jobs', 'Pipeline', 'CallLogs', 'RecruiterDashboard', 'ProcessTracking', 'Payments', 'Dropouts', 'FeeRequests', 'InterviewEvents', 'InterviewCheckins', 'Finance', 'Associates', 'Commissions', 'Analytics', 'MessageTemplates', 'Notifications', 'AuditLog', 'Deployments', 'Referrers', 'InterviewVenues', 'Vendors'],
  endpoints: () => ({}),
});
