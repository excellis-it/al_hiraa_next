import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

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

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Candidates', 'Users', 'Trades', 'States', 'Cities', 'Sources', 'Dashboard', 'Companies', 'Jobs', 'Pipeline', 'CallLogs', 'RecruiterDashboard', 'ProcessTracking', 'Payments', 'Dropouts', 'FeeRequests', 'InterviewEvents', 'InterviewCheckins', 'Finance', 'Associates', 'Commissions', 'Analytics', 'MessageTemplates', 'Notifications', 'AuditLog', 'Deployments', 'Referrers', 'InterviewVenues'],
  endpoints: () => ({}),
});
