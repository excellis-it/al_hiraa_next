import { apiSlice } from './apiSlice';

export const pipelineApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPipeline: builder.query({
      query: (params?: {
        page?: number;
        limit?: number;
        job_id?: number;
        status?: string;
        assigned_to?: number;
        follow_up_today?: boolean;
        upcoming?: boolean;
        search?: string;
      }) => ({
        url: '/pipeline',
        params,
      }),
      providesTags: ['Pipeline'],
    }),
    getPipelineEntry: builder.query({
      query: (id: number) => `/pipeline/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Pipeline', id }],
    }),
    addToPipeline: builder.mutation({
      query: (body: { candidate_id: number; job_id: number; assigned_to?: number; notes?: string }) => ({
        url: '/pipeline',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Pipeline', 'Jobs'],
    }),
    updatePipelineStatus: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/pipeline/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        'Pipeline',
        { type: 'Pipeline', id },
        'Jobs',
        'RecruiterDashboard',
      ],
    }),
  }),
});

export const {
  useGetPipelineQuery,
  useGetPipelineEntryQuery,
  useAddToPipelineMutation,
  useUpdatePipelineStatusMutation,
} = pipelineApi;
