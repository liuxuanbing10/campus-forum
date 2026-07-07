import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
    }
    return Promise.reject(error);
  }
);

export interface User {
  id: number;
  username: string;
  email: string;
  displayName: string;
  avatar_url?: string;
  role: string;
  is_banned: number;
  created_at: string;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  board_id: number;
  board_name?: string;
  author_id: number;
  author_name: string;
  avatar_url?: string;
  is_anonymous: number;
  is_pinned: number;
  is_private: number;
  images: string[];
  view_count: number;
  like_count: number;
  comment_count: number;
  favorite_count?: number;
  is_favorited: number;
  my_vote: number;
  created_at: string;
  updated_at: string;
}

export interface SearchResult {
  id: number;
  title: string;
  content: string;
  board_id: number;
  board_name: string;
  author_id: number;
  author_name: string;
  is_anonymous: number;
  created_at: string;
  view_count: number;
  comment_count: number;
  like_count: number;
  highlight: {
    title?: string;
    content?: string;
  };
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  content: string;
  related_id: number | null;
  related_type: string | null;
  is_read: number;
  created_at: string;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
  is_banned: number;
  created_at: string;
  post_count: number;
  comment_count: number;
}

export interface ShareInfo {
  title: string;
  url: string;
  description?: string;
}

export interface PostStats {
  view_count: number;
  like_count: number;
  comment_count: number;
  favorite_count: number;
}

export interface TeamCategory {
  id: number;
  name: string;
  icon: string | null;
  sort_order: number;
}

export interface Team {
  id: number;
  name: string;
  description: string;
  avatar: string | null;
  is_public: number;
  creator_id: number;
  max_members: number;
  category_id: number | null;
  invite_code: string | null;
  hide_members: number;
  member_count: number;
  post_count: number;
  created_at: string;
  updated_at: string;
  myRole: string | null;
  myApplicationStatus: string | null;
  isFavorited: boolean;
  role?: string;
}

export interface TeamMember {
  id: number;
  team_id: number;
  user_id: number;
  role: string;
  status: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  joined_at: string;
}

export interface TeamAnnouncement {
  id: number;
  team_id: number;
  title: string;
  content: string;
  author_id: number;
  is_pinned: number;
  username: string;
  display_name?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamPost {
  id: number;
  title: string;
  content: string;
  author_id: number;
  board_id: number;
  is_anonymous: number;
  is_pinned: number;
  is_private: number;
  view_count: number;
  username: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface MyTeamsResponse {
  teams: Team[];
  owned: Team[];
  adminOf: Team[];
  memberOf: Team[];
}

export interface CreateTeamData {
  name: string;
  description?: string;
  avatar?: string;
  isPublic?: boolean;
  maxMembers?: number;
  categoryId?: number;
  hideMembers?: boolean;
}

export interface UpdateTeamData {
  name?: string;
  description?: string;
  avatar?: string;
  isPublic?: boolean;
  maxMembers?: number;
  categoryId?: number | null;
  hideMembers?: boolean;
}

export const searchApi = {
  search: (q: string, page?: number, boardId?: number) =>
    api.get<{ posts: SearchResult[]; page: number; limit: number; total: number }>('/search', { params: { q, page, boardId } }),
  suggest: (q: string) =>
    api.get<{ suggestions: string[] }>('/search/suggest', { params: { q } }),
};

export const notificationsApi = {
  getNotifications: (page?: number) =>
    api.get<{ notifications: Notification[]; page: number; limit: number; total: number }>('/notifications', { params: { page } }),
  getUnreadCount: () => api.get<{ unread_count: number }>('/notifications/unread-count'),
  markAsRead: (id: number) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

export const favoritesApi = {
  getFavorites: (page?: number) =>
    api.get<{ posts: Post[]; page: number; limit: number }>('/favorites', { params: { page } }),
  toggleFavorite: (postId: number) => api.post('/favorites', { postId }),
};

export const adminApi = {
  getUsers: (page?: number, search?: string) =>
    api.get<{ users: AdminUser[]; page: number; limit: number; total: number }>('/admin/users', { params: { page, search } }),
  getUser: (id: number) => api.get<AdminUser>(`/admin/users/${id}`),
  banUser: (id: number) => api.put(`/admin/users/${id}/ban`),
  setRole: (id: number, role: string) => api.put(`/admin/users/${id}/role`, { role }),
};

export const postsApi = {
  getPost: (id: number) => api.get<Post>(`/posts/${id}`),
  updatePost: (id: number, data: { title: string; content: string; board_id: number; is_anonymous?: boolean }) =>
    api.put(`/posts/${id}`, data),
  getStats: (id: number) => api.get<PostStats>(`/posts/${id}/stats`),
  getShareInfo: (id: number) => api.get<ShareInfo>(`/posts/${id}/share`),
};

export const teamsApi = {
  getCategories: () => api.get<{ categories: TeamCategory[] }>('/team-categories'),
  getMyTeams: () => api.get<MyTeamsResponse>('/teams/my'),
  getFavorites: () => api.get<{ teams: Team[] }>('/teams/favorites'),
  getTeams: (page?: number, category?: number, sort?: string) => api.get<{ teams: Team[]; page: number; limit: number; sort: string; category: number }>('/teams', { params: { page, category, sort } }),
  searchTeams: (q: string, category?: number) => api.get<{ teams: Team[] }>('/teams/search', { params: { q, category } }),
  getTeam: (id: number) => api.get<Team>(`/teams/${id}`),
  getTeamMembers: (id: number) => api.get<{ members: TeamMember[]; hidden?: boolean }>(`/teams/${id}/members`),
  getTeamApplications: (id: number) => api.get<{ applications: TeamMember[] }>(`/teams/${id}/applications`),
  getAnnouncements: (id: number) => api.get<{ announcements: TeamAnnouncement[] }>(`/teams/${id}/announcements`),
  createAnnouncement: (id: number, data: { title: string; content: string; isPinned?: boolean }) => api.post<{ success: boolean; message: string }>(`/teams/${id}/announcements`, data),
  deleteAnnouncement: (teamId: number, annId: number) => api.delete<{ success: boolean; message: string }>(`/teams/${teamId}/announcements/${annId}`),
  getTeamPosts: (id: number, page?: number) => api.get<{ posts: TeamPost[]; page: number; limit: number }>(`/teams/${id}/posts`, { params: { page } }),
  addTeamPost: (teamId: number, postId: number) => api.post<{ success: boolean; message: string }>(`/teams/${teamId}/posts`, { postId }),
  removeTeamPost: (teamId: number, postId: number) => api.delete<{ success: boolean; message: string }>(`/teams/${teamId}/posts/${postId}`),
  createTeam: (data: CreateTeamData) => api.post<{ success: boolean; team: Team }>('/teams', data),
  updateTeam: (id: number, data: UpdateTeamData) => api.put<{ success: boolean; message: string }>(`/teams/${id}`, data),
  deleteTeam: (id: number) => api.delete<{ success: boolean; message: string }>(`/teams/${id}`),
  joinTeam: (id: number) => api.post<{ success: boolean; message: string }>(`/teams/${id}/join`),
  joinByCode: (code: string) => api.post<{ success: boolean; teamId: number; message: string }>('/teams/join-by-code', { code }),
  leaveTeam: (id: number) => api.post<{ success: boolean; message: string }>(`/teams/${id}/leave`),
  approveMember: (teamId: number, userId: number) => api.put<{ success: boolean; message: string }>(`/teams/${teamId}/members/${userId}`, { action: 'approve' }),
  rejectMember: (teamId: number, userId: number) => api.put<{ success: boolean; message: string }>(`/teams/${teamId}/members/${userId}`, { action: 'reject' }),
  removeMember: (teamId: number, userId: number) => api.delete<{ success: boolean; message: string }>(`/teams/${teamId}/members/${userId}`),
  setMemberRole: (teamId: number, userId: number, role: 'admin' | 'member') => api.post<{ success: boolean; message: string }>(`/teams/${teamId}/members/${userId}/role`, { role }),
  transferOwnership: (teamId: number, newOwnerId: number) => api.post<{ success: boolean; message: string }>(`/teams/${teamId}/transfer`, { newOwnerId }),
  toggleFavorite: (teamId: number) => api.post<{ success: boolean; favorited: boolean }>(`/teams/${teamId}/favorite`),
  resetInviteCode: (teamId: number) => api.post<{ success: boolean; inviteCode: string }>(`/teams/${teamId}/reset-invite`),
};

export default api;
