import { apiSlice } from './apiSlice';

export const interviewEventsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInterviewEvents: builder.query({
      query: (params?: Record<string, unknown>) => ({
        url: '/interview-events',
        params,
      }),
      providesTags: ['InterviewEvents'],
    }),
    getInterviewEvent: builder.query({
      query: (id: number) => `/interview-events/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'InterviewEvents', id }],
    }),
    createInterviewEvent: builder.mutation({
      query: (body) => ({
        url: '/interview-events',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['InterviewEvents'],
    }),
    updateInterviewEvent: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/interview-events/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        'InterviewEvents',
        { type: 'InterviewEvents' as const, id },
      ],
    }),
    addCandidatesToEvent: builder.mutation({
      query: ({ id, candidate_job_ids }: { id: number; candidate_job_ids: number[] }) => ({
        url: `/interview-events/${id}/add-candidates`,
        method: 'POST',
        body: { candidate_job_ids },
      }),
      invalidatesTags: ['InterviewEvents', 'InterviewCheckins'],
    }),
    getCheckins: builder.query({
      query: (eventId: number) => ({
        url: '/interview-checkins',
        params: { event_id: eventId },
      }),
      providesTags: (_result, _error, eventId) => [
        { type: 'InterviewCheckins', id: eventId },
      ],
    }),
    updateCheckin: builder.mutation({
      query: ({ id, event_id, ...body }) => ({
        url: `/interview-checkins/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { event_id }) => [
        { type: 'InterviewCheckins' as const, id: event_id },
        'InterviewEvents',
      ],
    }),
    getEventStatusCounts: builder.query<
      { lined_up: number; appeared: number; selected: number; rejected: number; on_hold: number },
      number
    >({
      query: (eventId: number) => `/interview-events/${eventId}/status-counts`,
      providesTags: (_r, _e, id) => [{ type: 'InterviewCheckins', id }],
    }),
    addMasterCandidate: builder.mutation<
      { candidate_job_id: number; checkin_id: number; created: boolean },
      { event_id: number; candidate_id: number; trade_id: number }
    >({
      query: ({ event_id, candidate_id, trade_id }) => ({
        url: `/interview-events/${event_id}/add-master-candidate`,
        method: 'POST',
        body: { candidate_id, trade_id },
      }),
      invalidatesTags: ['InterviewEvents', 'InterviewCheckins', 'Pipeline'],
    }),
    addSubAgentCandidates: builder.mutation<
      { created: number; errors: { row: any; error: string }[] },
      {
        event_id: number;
        associate_id: number;
        trade_id: number;
        rows: Array<Record<string, any>>;
      }
    >({
      query: ({ event_id, ...body }) => ({
        url: `/interview-events/${event_id}/add-sub-agent-candidates`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['InterviewEvents', 'InterviewCheckins', 'Pipeline'],
    }),
  }),
});

export const {
  useGetInterviewEventsQuery,
  useGetInterviewEventQuery,
  useCreateInterviewEventMutation,
  useUpdateInterviewEventMutation,
  useAddCandidatesToEventMutation,
  useGetCheckinsQuery,
  useUpdateCheckinMutation,
  useGetEventStatusCountsQuery,
  useAddMasterCandidateMutation,
  useAddSubAgentCandidatesMutation,
} = interviewEventsApi;
