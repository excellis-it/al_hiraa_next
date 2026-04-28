import { apiSlice } from './apiSlice';

export const financeApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getFinanceOverview: builder.query({
      query: (params?: { from_date?: string; to_date?: string }) => ({
        url: '/finance/overview',
        params,
      }),
      providesTags: ['Finance'],
    }),
    getAllPayments: builder.query({
      query: (params?: Record<string, any>) => ({
        url: '/finance/payments',
        params,
      }),
      providesTags: ['Finance'],
    }),
    getPaymentsByCandidate: builder.query({
      query: (candidateJobId: number) => `/finance/payments/${candidateJobId}`,
      providesTags: ['Finance'],
    }),
  }),
});

export const {
  useGetFinanceOverviewQuery,
  useGetAllPaymentsQuery,
  useGetPaymentsByCandidateQuery,
} = financeApi;
