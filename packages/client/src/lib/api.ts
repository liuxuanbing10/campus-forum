import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
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
  email: string | null;
  displayName: string;
  avatar_url?: string;
  avatarUrl?: string;
  role: string;
  is_banned: number;
  isBanned: boolean;
  isAdmin: boolean;
  created_at: string;
  createdAt: string;
}

export interface UpdateProfileData {
  display_name?: string;
  email?: string;
  avatar_url?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
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
  updatePost: (id: number, data: { title: string; content: string; board_id: number; is_anonymous?: boolean; is_private?: boolean; images?: string[] }) =>
    api.put(`/posts/${id}`, data),
  getStats: (id: number) => api.get<PostStats>(`/posts/${id}/stats`),
  getShareInfo: (id: number) => api.get<ShareInfo>(`/posts/${id}/share`),
  togglePin: (id: number) => api.put<{ success: boolean; isPinned: boolean; message: string }>(`/posts/${id}/pin`),
  togglePrivacy: (id: number) => api.put<{ success: boolean; isPrivate: boolean; message: string }>(`/posts/${id}/privacy`),
  uploadImage: (image: string, filename?: string) =>
    api.post<{ success: boolean; url: string; filename: string }>('/upload', { image, filename }),
};

export const authApi = {
  updateProfile: (data: UpdateProfileData) => api.put<{ success: boolean; message: string; user: User }>('/auth/me', data),
  changePassword: (data: ChangePasswordData) => api.put<{ success: boolean; message: string }>('/auth/password', data),
  sendVerifyEmail: (email: string) => api.post<{ success: boolean; message: string; token?: string; devCode?: string }>('/auth/send-verify-email', { email }),
  verifyEmail: (token: string, code: string) => api.post<{ success: boolean; message: string }>('/auth/verify-email', { token, code }),
  forgotPassword: (email: string) => api.post<{ success: boolean; message: string; token?: string; devCode?: string }>('/auth/forgot-password', { email }),
  resetPassword: (token: string, code: string, newPassword: string) => api.post<{ success: boolean; message: string }>('/auth/reset-password', { token, code, newPassword }),
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

// ===== 用户主页 =====
export interface UserProfile {
  id: number;
  username: string;
  displayName: string;
  email: string | null;
  avatar_url?: string;
  role: string;
  is_banned: number;
  created_at: string;
  post_count: number;
  comment_count: number;
  follower_count: number;
  following_count: number;
  points: number;
  level: string;
  is_following: number;
}

export interface UserPost {
  id: number;
  title: string;
  board_name: string;
  created_at: string;
  view_count: number;
  comment_count: number;
  like_count: number;
}

export interface UserComment {
  id: number;
  content: string;
  post_id: number;
  post_title: string;
  created_at: string;
}

export interface FollowStatus {
  isFollowing: boolean;
}

// ===== 私信 =====
export interface Conversation {
  id: number;
  other_user_id: number;
  other_username: string;
  other_avatar?: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  created_at: string;
}

// ===== 举报 =====
export interface ReportData {
  target_type: 'post' | 'comment';
  target_id: number;
  reason: string;
  description?: string;
}

// ===== OAuth =====
export interface OAuthAccount {
  provider: string;
  provider_user_id: string;
  provider_username?: string;
  binded_at: string;
}

// ===== 管理后台 =====
export interface PendingPost {
  id: number;
  title: string;
  author_name: string;
  created_at: string;
  status: string;
}

export interface SensitiveWord {
  id: number;
  word: string;
  replacement: string;
  created_at: string;
}

export interface AdminReport {
  id: number;
  target_type: string;
  target_id: number;
  reporter_name: string;
  reason: string;
  status: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: number;
  details: string;
  created_at: string;
}

export interface PostVersion {
  id: number;
  post_id: number;
  title: string;
  content: string;
  editor_name: string;
  created_at: string;
}

// ===== Captcha =====
export interface CaptchaData {
  captchaId: string;
  imageBase64?: string;
  question?: string;
}


// ===== 用户主页 API =====
export const userApi = {
  getProfile: (id: number) => api.get<UserProfile>(`/users/${id}`),
  getPosts: (id: number, page?: number) => api.get<{ posts: UserPost[]; page: number }>(`/users/${id}/posts`, { params: { page } }),
  getComments: (id: number, page?: number) => api.get<{ comments: UserComment[]; page: number }>(`/users/${id}/comments`, { params: { page } }),
  getPoints: (id: number) => api.get<{ points: number; level: string }>(`/users/${id}/points`),
};

// ===== 关注 API =====
export const followApi = {
  follow: (userId: number) => api.post<{ success: boolean }>('/follow', { userId }),
  unfollow: (userId: number) => api.delete('/follow', { data: { userId } }),
  check: (userId: number) => api.get<{ isFollowing: boolean }>('/follow/check', { params: { userId } }),
  getFollowers: (userId: number, page?: number) => api.get<{ users: UserProfile[]; page: number }>(`/users/${userId}/followers`, { params: { page } }),
  getFollowing: (userId: number, page?: number) => api.get<{ users: UserProfile[]; page: number }>(`/users/${userId}/following`, { params: { page } }),
};

// ===== 私信 API =====
export const messageApi = {
  getConversations: () => api.get<{ conversations: Conversation[] }>('/conversations'),
  getMessages: (conversationId: number, page?: number) => api.get<{ messages: Message[] }>(`/conversations/${conversationId}/messages`, { params: { page } }),
  send: (receiverId: number, content: string) => api.post<{ success: boolean; message: Message }>('/messages', { receiverId, content }),
  getUnreadCount: () => api.get<{ unread_count: number }>('/messages/unread-count'),
};

// ===== 举报 API =====
export const reportApi = {
  create: (data: ReportData) => api.post<{ success: boolean }>('/reports', data),
};

// ===== 头像上传 API =====
export const avatarApi = {
  upload: (imageBase64: string) => api.post<{ success: boolean; url: string }>('/users/avatar', { image: imageBase64 }),
};

// ===== OAuth API =====
export const oauthApi = {
  bind: (provider: string, code: string) => api.post<{ success: boolean }>('/auth/oauth/bind', { provider, code }),
  getAccounts: () => api.get<{ accounts: OAuthAccount[] }>('/auth/oauth/accounts'),
  unbind: (provider: string) => api.delete('/auth/oauth/unbind', { data: { provider } }),
};

// ===== 验证码 API =====
export const captchaApi = {
  get: () => api.get<CaptchaData>('/auth/captcha'),
  verify: (captchaId: string, answer: string) => api.post<{ success: boolean }>('/auth/verify-captcha', { captchaId, answer }),
};

// ===== 导出 API =====
export const exportApi = {
  exportData: () => api.get<{ success: boolean; url: string }>('/user/export'),
};

// ===== 管理后台 API =====
export const adminExtendedApi = {
  getPendingPosts: (page?: number) => api.get<{ posts: PendingPost[]; page: number; total: number }>('/admin/pending-posts', { params: { page } }),
  reviewPost: (id: number, action: 'approve' | 'reject', reason?: string) => api.put(`/admin/posts/${id}/review`, { action, reason }),
  getSensitiveWords: () => api.get<{ words: SensitiveWord[] }>('/admin/sensitive-words'),
  addSensitiveWord: (word: string, replacement?: string) => api.post<{ success: boolean }>('/admin/sensitive-words', { word, replacement }),
  deleteSensitiveWord: (id: number) => api.delete(`/admin/sensitive-words/${id}`),
  getReports: (page?: number) => api.get<{ reports: AdminReport[]; page: number; total: number }>('/admin/reports', { params: { page } }),
  resolveReport: (id: number, action: 'dismiss' | 'penalize') => api.put(`/admin/reports/${id}`, { action }),
  getAuditLogs: (page?: number) => api.get<{ logs: AuditLog[]; page: number; total: number }>('/admin/audit-logs', { params: { page } }),
  getStats: () => api.get<AdminStats>('/admin/stats'),
};

export interface AdminStats {
  overview: {
    totalUsers: number;
    totalPosts: number;
    totalComments: number;
    totalTeams: number;
    totalBoards: number;
  };
  today: {
    users: number;
    posts: number;
    comments: number;
  };
  userGrowth: { date: string; count: number }[];
  postTrend: { date: string; count: number }[];
  boardDist: { name: string; count: number }[];
  teamRanking: { name: string; member_count: number; post_count: number }[];
  activeUsers: { username: string; display_name: string; points: number; post_count: number }[];
}

// ===== 编辑历史 API =====
export const versionApi = {
  getVersions: (postId: number) => api.get<{ versions: PostVersion[] }>(`/posts/${postId}/versions`),
};

// ===== 评论 API =====
export const commentApi = {
  update: (commentId: number, content: string) => api.put<{ success: boolean }>(`/comments/${commentId}`, { content }),
};
