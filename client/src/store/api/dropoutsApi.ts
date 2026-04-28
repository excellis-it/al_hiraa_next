import { apiSlice } from './apiSlice';

export const dropoutsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDropouts: builder.query({
      query: (params?: Record<string, unknown>) => ({
        url: '/dropouts',
        params,
      }),
      providesTags: ['Dropouts'],
    }),
    createDropout: builder.mutation({
      query: (body) => ({
        url: '/dropouts',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Dropouts', 'Pipeline'],
    }),
  }),
});

export const {
  useGetDropoutsQuery,
  useCreateDropoutMutation,
} = dropoutsApi;
