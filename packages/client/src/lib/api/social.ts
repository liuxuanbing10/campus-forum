import api from './client';
import type { UserProfile, UserPost, UserComment, Conversation, Message, Notification, ReportData } from '../../types/api';

export const userApi = {
  getProfile: (id: number) => api.get<UserProfile>(`/users/${id}`),
  getPosts: (id: number, page?: number) => api.get<{ posts: UserPost[]; page: number }>(`/users/${id}/posts`, { params: { page } }),
  getComments: (id: number, page?: number) => api.get<{ comments: UserComment[]; page: number }>(`/users/${id}/comments`, { params: { page } }),
  getPoints: (id: number) => api.get<{ points: number; level: string }>(`/users/${id}/points`),
};

export const followApi = {
  follow: (userId: number) => api.post<{ success: boolean }>('/follow', { userId }),
  unfollow: (userId: number) => api.delete('/follow', { data: { userId } }),
  check: (userId: number) => api.get<{ isFollowing: boolean }>('/follow/check', { params: { userId } }),
  getFollowers: (userId: number, page?: number) => api.get<{ users: UserProfile[]; page: number }>(`/users/${userId}/followers`, { params: { page } }),
  getFollowing: (userId: number, page?: number) => api.get<{ users: UserProfile[]; page: number }>(`/users/${userId}/following`, { params: { page } }),
};

export const messageApi = {
  getConversations: () => api.get<{ conversations: Conversation[] }>('/conversations'),
  getMessages: (conversationId: number, page?: number) => api.get<{ messages: Message[] }>(`/conversations/${conversationId}/messages`, { params: { page } }),
  send: (receiverId: number, content: string) => api.post<{ success: boolean; message: Message }>('/messages', { receiverId, content }),
  getUnreadCount: () => api.get<{ unreadCount: number }>('/messages/unread-count'),
};

export const notificationsApi = {
  getNotifications: (page?: number) =>
    api.get<{ notifications: Notification[]; page: number; limit: number; total: number }>('/notifications', { params: { page } }),
  getUnreadCount: () => api.get<{ unreadCount: number }>('/notifications/unread-count'),
  markAsRead: (id: number) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

export const reportApi = {
  create: (data: ReportData) => api.post<{ success: boolean }>('/reports', data),
};
