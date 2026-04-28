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

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const refreshToken = (api.getState() as RootState).auth.refreshToken;

    if (refreshToken) {
      const refreshResult = await baseQuery(
        { url: '/auth/refresh-token', method: 'POST', body: { refresh_token: refreshToken } },
        api,
        extraOptions,
      );

      if (refreshResult.data) {
        const { access_token, refresh_token } = refreshResult.data as { access_token: string; refresh_token: string };
        const user = (api.getState() as RootState).auth.user!;
        api.dispatch(setCredentials({ user, access_token, refresh_token }));
        result = await baseQuery(args, api, extraOptions);
      } else {
        api.dispatch(logout());
      }
    } else {
      api.dispatch(logout());
    }
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Candidates', 'Users', 'Trades', 'States', 'Cities', 'Sources', 'Dashboard', 'Companies', 'Jobs', 'Pipeline', 'CallLogs', 'RecruiterDashboard', 'ProcessTracking', 'Payments', 'Dropouts', 'FeeRequests', 'InterviewEvents', 'InterviewCheckins', 'Finance', 'Associates', 'Commissions', 'Analytics', 'MessageTemplates', 'Notifications', 'AuditLog', 'Deployments', 'Referrers', 'InterviewVenues'],
  endpoints: () => ({}),
});
