import { apiSlice } from './apiSlice';

export const vendorsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getVendors: builder.query({
      query: (params?: Record<string, any>) => ({ url: '/vendors', params }),
      providesTags: ['Vendors'],
    }),
    getVendor: builder.query({
      query: (id: number) => `/vendors/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Vendors', id }],
    }),
    createVendor: builder.mutation({
      query: (body) => ({ url: '/vendors', method: 'POST', body }),
      invalidatesTags: ['Vendors'],
    }),
    updateVendor: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/vendors/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Vendors'],
    }),
    deleteVendor: builder.mutation({
      query: (id: number) => ({ url: `/vendors/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Vendors'],
    }),
  }),
});

export const {
  useGetVendorsQuery,
  useGetVendorQuery,
  useCreateVendorMutation,
  useUpdateVendorMutation,
  useDeleteVendorMutation,
} = vendorsApi;
