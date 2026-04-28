import { apiSlice } from './apiSlice';

export const jobsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getJobs: builder.query({
      query: (params?: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        company_id?: number;
        trade_id?: number;
        priority?: string;
      }) => ({
        url: '/jobs',
        params,
      }),
      providesTags: ['Jobs'],
    }),
    getJob: builder.query({
      query: (id: number) => `/jobs/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Jobs', id }],
    }),
    createJob: builder.mutation({
      query: (body) => ({
        url: '/jobs',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Jobs', 'InterviewEvents'],
    }),
    updateJob: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/jobs/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => ['Jobs', { type: 'Jobs', id }],
    }),
    getRecruiterDashboard: builder.query<any, void>({
      query: () => '/jobs/dashboard',
      providesTags: ['RecruiterDashboard'],
    }),
  }),
});

export const {
  useGetJobsQuery,
  useGetJobQuery,
  useCreateJobMutation,
  useUpdateJobMutation,
  useGetRecruiterDashboardQuery,
} = jobsApi;
