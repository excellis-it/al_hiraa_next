import { apiSlice } from './apiSlice';

export const mastersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTrades: builder.query({
      query: (all?: boolean) => ({
        url: '/masters/trades',
        params: all ? { all: 'true' } : undefined,
      }),
      providesTags: ['Trades'],
    }),
    createTrade: builder.mutation({
      query: (body) => ({ url: '/masters/trades', method: 'POST', body }),
      invalidatesTags: ['Trades'],
    }),
    updateTrade: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/masters/trades/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Trades'],
    }),

    getStates: builder.query({
      query: (all?: boolean) => ({
        url: '/masters/states',
        params: all ? { all: 'true' } : undefined,
      }),
      providesTags: ['States'],
    }),
    createState: builder.mutation({
      query: (body) => ({ url: '/masters/states', method: 'POST', body }),
      invalidatesTags: ['States'],
    }),
    updateState: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/masters/states/${id}`, method: 'PUT', body }),
      invalidatesTags: ['States'],
    }),

    getCities: builder.query({
      query: (params?: { state_id?: number; all?: boolean }) => ({
        url: '/masters/cities',
        params: {
          ...(params?.state_id ? { state_id: params.state_id } : {}),
          ...(params?.all ? { all: 'true' } : {}),
        },
      }),
      providesTags: ['Cities'],
    }),
    createCity: builder.mutation({
      query: (body) => ({ url: '/masters/cities', method: 'POST', body }),
      invalidatesTags: ['Cities'],
    }),
    updateCity: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/masters/cities/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Cities'],
    }),

    getSources: builder.query({
      query: (all?: boolean) => ({
        url: '/masters/sources',
        params: all ? { all: 'true' } : undefined,
      }),
      providesTags: ['Sources'],
    }),
    createSource: builder.mutation({
      query: (body) => ({ url: '/masters/sources', method: 'POST', body }),
      invalidatesTags: ['Sources'],
    }),
    updateSource: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/masters/sources/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Sources'],
    }),

    getVenues: builder.query({
      query: (all?: boolean) => ({
        url: '/masters/venues',
        params: all ? { all: 'true' } : undefined,
      }),
      providesTags: ['InterviewVenues'],
    }),
    createVenue: builder.mutation({
      query: (body) => ({ url: '/masters/venues', method: 'POST', body }),
      invalidatesTags: ['InterviewVenues'],
    }),
    updateVenue: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/masters/venues/${id}`, method: 'PUT', body }),
      invalidatesTags: ['InterviewVenues'],
    }),
  }),
});

export const {
  useGetTradesQuery,
  useCreateTradeMutation,
  useUpdateTradeMutation,
  useGetStatesQuery,
  useCreateStateMutation,
  useUpdateStateMutation,
  useGetCitiesQuery,
  useCreateCityMutation,
  useUpdateCityMutation,
  useGetSourcesQuery,
  useCreateSourceMutation,
  useUpdateSourceMutation,
  useGetVenuesQuery,
  useCreateVenueMutation,
  useUpdateVenueMutation,
} = mastersApi;
