import { apiSlice } from './apiSlice';

export const callLogsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCallLogs: builder.query({
      query: (candidateJobId: number) => ({
        url: '/call-logs',
        params: { candidate_job_id: candidateJobId },
      }),
      providesTags: (_result, _error, candidateJobId) => [{ type: 'CallLogs', id: candidateJobId }],
    }),
    getCallLogsByCandidate: builder.query({
      query: (candidateId: number) => ({
        url: '/call-logs',
        params: { candidate_id: candidateId },
      }),
      providesTags: (_result, _error, candidateId) => [{ type: 'CallLogs', id: `cand-${candidateId}` }],
    }),
    createCallLog: builder.mutation({
      query: (body: { candidate_job_id: number; outcome: string; notes?: string; follow_up_date?: string }) => ({
        url: '/call-logs',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, body) => [
        'Pipeline',
        { type: 'CallLogs', id: body.candidate_job_id },
      ],
    }),
  }),
});

export const {
  useGetCallLogsQuery,
  useGetCallLogsByCandidateQuery,
  useCreateCallLogMutation,
} = callLogsApi;
