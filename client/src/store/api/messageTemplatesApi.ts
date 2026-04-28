import { apiSlice } from './apiSlice';

export interface MessageTemplate {
  id: number;
  name: string;
  type: 'whatsapp' | 'email' | 'sms';
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PreviewResult {
  preview: string;
}

export const messageTemplatesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTemplates: builder.query<MessageTemplate[], { type?: string; is_active?: boolean } | void>({
      query: (params) => ({
        url: '/message-templates',
        params: params || {},
      }),
      providesTags: ['MessageTemplates'],
    }),

    getTemplate: builder.query<MessageTemplate, number>({
      query: (id) => `/message-templates/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'MessageTemplates', id }],
    }),

    createTemplate: builder.mutation<MessageTemplate, Partial<MessageTemplate>>({
      query: (body) => ({
        url: '/message-templates',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['MessageTemplates'],
    }),

    updateTemplate: builder.mutation<MessageTemplate, { id: number } & Partial<MessageTemplate>>({
      query: ({ id, ...body }) => ({
        url: `/message-templates/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['MessageTemplates'],
    }),

    previewTemplate: builder.mutation<PreviewResult, { id: number; sample_data: Record<string, string> }>({
      query: ({ id, sample_data }) => ({
        url: `/message-templates/${id}/preview`,
        method: 'POST',
        body: { sample_data },
      }),
    }),
  }),
});

export const {
  useGetTemplatesQuery,
  useGetTemplateQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  usePreviewTemplateMutation,
} = messageTemplatesApi;
