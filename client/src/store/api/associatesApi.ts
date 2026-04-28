import { apiSlice } from './apiSlice';

export const associatesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAssociates: builder.query({
      query: (params?: Record<string, any>) => ({
        url: '/associates',
        params,
      }),
      providesTags: ['Associates'],
    }),
    getAssociate: builder.query({
      query: (id: number) => `/associates/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Associates', id }],
    }),
    createAssociate: builder.mutation({
      query: (body) => ({
        url: '/associates',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Associates'],
    }),
    updateAssociate: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/associates/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Associates'],
    }),
    createCommission: builder.mutation({
      query: (body) => ({
        url: '/associates/commissions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Associates', 'Commissions'],
    }),
    updateCommissionStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/associates/commissions/${id}`,
        method: 'PUT',
        body: { status },
      }),
      invalidatesTags: ['Associates', 'Commissions'],
    }),
    getCommissionSummary: builder.query({
      query: (associateId: number) => `/associates/${associateId}/commission-summary`,
      providesTags: ['Commissions'],
    }),
  }),
});

export const {
  useGetAssociatesQuery,
  useGetAssociateQuery,
  useCreateAssociateMutation,
  useUpdateAssociateMutation,
  useCreateCommissionMutation,
  useUpdateCommissionStatusMutation,
  useGetCommissionSummaryQuery,
} = associatesApi;
