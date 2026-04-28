import { apiSlice } from './apiSlice';

export const deploymentsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDeployments: builder.query({
      query: (params) => ({ url: '/deployments', params }),
      providesTags: ['Deployments' as any],
    }),
    getDeployment: builder.query({
      query: (id: number) => `/deployments/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Deployments' as any, id }],
    }),
    getDeploymentsSummary: builder.query({
      query: () => '/deployments/summary',
      providesTags: ['Deployments' as any],
    }),
    getExpiringSoon: builder.query({
      query: (days = 30) => ({ url: '/deployments/expiring-soon', params: { days } }),
      providesTags: ['Deployments' as any],
    }),
    createDeployment: builder.mutation({
      query: (body) => ({ url: '/deployments', method: 'POST', body }),
      invalidatesTags: ['Deployments' as any, 'Candidates'],
    }),
    updateDeployment: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/deployments/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Deployments' as any, 'Candidates'],
    }),
    triggerExpiryNotifications: builder.mutation({
      query: () => ({ url: '/deployments/notify-expiry', method: 'POST' }),
      invalidatesTags: ['Deployments' as any],
    }),
  }),
});

export const {
  useGetDeploymentsQuery,
  useGetDeploymentQuery,
  useGetDeploymentsSummaryQuery,
  useGetExpiringSoonQuery,
  useCreateDeploymentMutation,
  useUpdateDeploymentMutation,
  useTriggerExpiryNotificationsMutation,
} = deploymentsApi;
