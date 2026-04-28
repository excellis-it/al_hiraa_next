import { apiSlice } from './apiSlice';

export const candidatesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCandidates: builder.query({
      query: (params) => ({
        url: '/candidates',
        params,
      }),
      providesTags: ['Candidates'],
    }),
    getCandidate: builder.query({
      query: (id: number) => `/candidates/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Candidates', id }],
    }),
    createCandidate: builder.mutation({
      query: (body) => ({
        url: '/candidates',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Candidates', 'Dashboard'],
    }),
    updateCandidate: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/candidates/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Candidates', id },
        'Candidates',
        'Dashboard',
      ],
    }),
    checkDuplicate: builder.query({
      query: (params: { passport?: string; phone?: string }) => ({
        url: '/candidates/duplicate-check',
        params,
      }),
    }),
    getIncompleteQueue: builder.query({
      query: (params) => ({
        url: '/candidates/incomplete/queue',
        params,
      }),
      providesTags: ['Candidates'],
    }),
    getDashboardStats: builder.query({
      query: () => '/candidates/dashboard',
      providesTags: ['Dashboard'],
    }),
    bulkDeleteIncomplete: builder.mutation({
      query: (ids: number[]) => ({
        url: '/candidates/incomplete/bulk-delete',
        method: 'POST',
        body: { ids },
      }),
      invalidatesTags: ['Candidates'],
    }),
    batchImportToInterview: builder.mutation({
      query: (body: {
        event_id: number;
        trade_id: number;
        rows: Array<Record<string, any>>;
      }) => ({
        url: '/candidates/batch-import-to-interview',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Candidates', 'InterviewEvents', 'Pipeline'],
    }),
    checkPhonesBulk: builder.mutation<{ existing: string[] }, string[]>({
      query: (phones) => ({
        url: '/candidates/phones-check',
        method: 'POST',
        body: { phones },
      }),
    }),
    bulkImportAll: builder.mutation<
      { added: number; duplicates: any[]; errors: { row: any; error: string }[] },
      any[]
    >({
      query: (rows) => ({
        url: '/candidates/bulk-import-all',
        method: 'POST',
        body: { rows },
      }),
      invalidatesTags: ['Candidates'],
    }),
  }),
});

export const {
  useGetCandidatesQuery,
  useGetCandidateQuery,
  useCreateCandidateMutation,
  useUpdateCandidateMutation,
  useLazyCheckDuplicateQuery,
  useGetIncompleteQueueQuery,
  useGetDashboardStatsQuery,
  useBulkDeleteIncompleteMutation,
  useBatchImportToInterviewMutation,
  useCheckPhonesBulkMutation,
  useBulkImportAllMutation,
} = candidatesApi;
