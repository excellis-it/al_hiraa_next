import { apiSlice } from './apiSlice';

export const paymentsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPayments: builder.query({
      query: (candidateJobId: number) => ({
        url: '/payments',
        params: { candidate_job_id: candidateJobId },
      }),
      providesTags: (_result, _error, candidateJobId) => [
        { type: 'Payments', id: candidateJobId },
      ],
    }),
    getPaymentSummary: builder.query({
      query: (candidateJobId: number) => ({
        url: '/payments/summary',
        params: { candidate_job_id: candidateJobId },
      }),
      providesTags: (_result, _error, candidateJobId) => [
        { type: 'Payments', id: candidateJobId },
      ],
    }),
    createPayment: builder.mutation({
      query: (body) => ({
        url: '/payments',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payments'],
    }),
    recordPayment: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/payments/${id}/record`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Payments'],
    }),
  }),
});

export const {
  useGetPaymentsQuery,
  useGetPaymentSummaryQuery,
  useCreatePaymentMutation,
  useRecordPaymentMutation,
} = paymentsApi;
