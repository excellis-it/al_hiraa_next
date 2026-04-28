import { apiSlice } from './apiSlice';

export const companiesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCompanies: builder.query({
      query: (params?: { page?: number; limit?: number; search?: string; status?: string }) => ({
        url: '/companies',
        params,
      }),
      providesTags: ['Companies'],
    }),
    getCompany: builder.query({
      query: (id: number) => `/companies/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Companies', id }],
    }),
    createCompany: builder.mutation({
      query: (body) => ({
        url: '/companies',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Companies'],
    }),
    updateCompany: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/companies/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => ['Companies', { type: 'Companies', id }],
    }),
  }),
});

export const {
  useGetCompaniesQuery,
  useGetCompanyQuery,
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
} = companiesApi;
