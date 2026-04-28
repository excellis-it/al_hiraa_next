import { apiSlice } from './apiSlice';

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

export interface UsersResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
}

export const usersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<UsersResponse, { page?: number; limit?: number } | void>({
      query: (params) => ({
        url: '/users',
        params: params || {},
      }),
      providesTags: ['Users'],
    }),

    getUser: builder.query<User, string>({
      query: (id) => `/users/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'Users', id }],
    }),

    createUser: builder.mutation<User, Partial<User> & { password?: string }>({
      query: (body) => ({
        url: '/users',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Users'],
    }),

    updateUser: builder.mutation<User, { id: string } & Partial<User>>({
      query: ({ id, ...body }) => ({
        url: `/users/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Users'],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
} = usersApi;
