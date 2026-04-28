import { apiSlice } from './apiSlice';

export const analyticsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAnalyticsOverview: builder.query<any, void>({
      query: () => '/analytics/overview',
      providesTags: ['Analytics'],
    }),
    getPipelineVelocity: builder.query<any, void>({
      query: () => '/analytics/pipeline-velocity',
      providesTags: ['Analytics'],
    }),
    getSourcePerformance: builder.query<any, void>({
      query: () => '/analytics/source-performance',
      providesTags: ['Analytics'],
    }),
    getDropoutAnalysis: builder.query<any, void>({
      query: () => '/analytics/dropout-analysis',
      providesTags: ['Analytics'],
    }),
    getDeploymentSpeed: builder.query<any, void>({
      query: () => '/analytics/deployment-speed',
      providesTags: ['Analytics'],
    }),
  }),
});

export const {
  useGetAnalyticsOverviewQuery,
  useGetPipelineVelocityQuery,
  useGetSourcePerformanceQuery,
  useGetDropoutAnalysisQuery,
  useGetDeploymentSpeedQuery,
} = analyticsApi;
