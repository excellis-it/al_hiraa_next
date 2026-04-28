import { apiSlice } from './apiSlice';

export const processDetailsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProcessDetails: builder.query({
      query: (candidateJobId: number) => `/process-details/${candidateJobId}`,
      providesTags: (_r, _e, id) => [{ type: 'ProcessTracking', id }],
    }),
    getAllProcessDetails: builder.query({
      query: (params?: {
        page?: number; limit?: number; search?: string;
        medical_status?: string; candidate_status?: string; year?: number; job_id?: number;
      }) => ({ url: '/process-details', params }),
      providesTags: ['ProcessTracking'],
    }),
    getStageSummary: builder.query<any, void>({
      query: () => '/process-details/stage-summary',
      providesTags: ['ProcessTracking'],
    }),
    updateProcessDetails: builder.mutation({
      query: ({ candidateJobId, ...body }: any) => ({
        url: `/process-details/${candidateJobId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['ProcessTracking'],
    }),
    // Batch init from interview checkins
    batchFromInterview: builder.mutation({
      query: (body: { candidate_job_ids: number[]; initial_data?: any }) => ({
        url: '/process-details/batch-from-interview',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ProcessTracking'],
    }),
    // Quick-add: find/create candidate by passport + create process record
    quickAddProcess: builder.mutation({
      query: (body: any) => ({
        url: '/process-details/quick-add',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ProcessTracking'],
    }),
    // CSV import
    importProcessCsv: builder.mutation({
      query: (body: { rows: any[]; job_id: number }) => ({
        url: '/process-details/import-csv',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ProcessTracking'],
    }),
  }),
});

export const {
  useGetProcessDetailsQuery,
  useGetAllProcessDetailsQuery,
  useGetStageSummaryQuery,
  useUpdateProcessDetailsMutation,
  useBatchFromInterviewMutation,
  useQuickAddProcessMutation,
  useImportProcessCsvMutation,
} = processDetailsApi;
