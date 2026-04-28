import { apiSlice } from './apiSlice';

export interface AuditLogEntry {
  id: number;
  user_id: string;
  user_name: string;
  entity_type: string;
  entity_id: string;
  action: 'created' | 'updated' | 'deleted';
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  created_at: string;
}

export interface AuditLogResponse {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export const auditApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAuditLog: builder.query<
      AuditLogResponse,
      { page?: number; limit?: number; entity_type?: string; user_id?: string; action?: string } | void
    >({
      query: (params) => ({
        url: '/activity-log',
        params: params || {},
      }),
      providesTags: ['AuditLog'],
    }),
  }),
});

export const { useGetAuditLogQuery } = auditApi;
