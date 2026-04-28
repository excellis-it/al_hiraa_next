import { apiSlice } from './apiSlice';

export interface Notification {
  id: number;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_read: boolean;
  created_at: string;
  entity_type?: string;
  entity_id?: string;
}

export interface UnreadCountResponse {
  count: number;
}

export interface NotificationsResponse {
  data: Notification[];
  meta: { total: number; page: number; limit: number; pages: number };
}

export const notificationsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<NotificationsResponse, { unread_only?: boolean } | void>({
      query: (params) => ({
        url: '/notifications',
        params: params || {},
      }),
      providesTags: ['Notifications'],
    }),

    getUnreadCount: builder.query<UnreadCountResponse, void>({
      query: () => '/notifications/unread-count',
      providesTags: ['Notifications'],
    }),

    markRead: builder.mutation<Notification, number>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: 'PUT',
      }),
      invalidatesTags: ['Notifications'],
    }),

    markAllRead: builder.mutation<{ success: boolean }, void>({
      query: () => ({
        url: '/notifications/mark-all-read',
        method: 'PUT',
      }),
      invalidatesTags: ['Notifications'],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
} = notificationsApi;
