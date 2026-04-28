import { apiSlice } from './apiSlice';

export const processTrackingApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProcessSteps: builder.query({
      query: (candidateJobId: number) => `/process-tracking/${candidateJobId}`,
      providesTags: (_result, _error, candidateJobId) => [
        { type: 'ProcessTracking', id: candidateJobId },
      ],
    }),
    updateProcessStep: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/process-tracking/step/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: [{ type: 'ProcessTracking' }],
    }),
  }),
});

export const {
  useGetProcessStepsQuery,
  useUpdateProcessStepMutation,
} = processTrackingApi;
