import { apiSlice } from './apiSlice';

export const referrersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getReferrers: builder.query<any[], boolean | void>({
      query: (all) => ({ url: '/referrers', params: all ? { all: 'true' } : undefined }),
      providesTags: ['Referrers'],
    }),
    getReferrer: builder.query<any, number>({
      query: (id) => `/referrers/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Referrers', id }],
    }),
    createReferrer: builder.mutation({
      query: (body) => ({ url: '/referrers', method: 'POST', body }),
      invalidatesTags: ['Referrers'],
    }),
    updateReferrer: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/referrers/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Referrers'],
    }),
    deleteReferrer: builder.mutation({
      query: (id: number) => ({ url: `/referrers/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Referrers'],
    }),
  }),
});

export const {
  useGetReferrersQuery,
  useGetReferrerQuery,
  useCreateReferrerMutation,
  useUpdateReferrerMutation,
  useDeleteReferrerMutation,
} = referrersApi;
