import axios from 'axios';
import type { User, UpdateProfileData, ChangePasswordData, Post, SearchResult, Notification, AdminUser, ShareInfo, PostStats, TeamCategory, Team, TeamMember, TeamAnnouncement, TeamPost, TeamContentPost, TeamFile, TeamContentComment, MyTeamsResponse, CreateTeamData, UpdateTeamData, UserProfile, UserPost, UserComment, FollowStatus, Conversation, Message, ReportData, OAuthAccount, PendingPost, SensitiveWord, AdminReport, AuditLog, PostVersion, CaptchaData, AdminStats, DeviceBlacklistEntry, UserDevice } from '@campus-forum/core';
import { getDeviceCode } from './device';

const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  withCredentials: true,
});

const TOKEN_KEY = 'forum_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use(config => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['x-device-id'] = getDeviceCode();
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      clearToken();
    }
    return Promise.reject(error);
  }
);

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
  banUser: (id: number, opts?: { ban?: boolean; duration?: number; reason?: string }) =>
    api.put(`/admin/users/${id}/ban`, opts || {}),
  setRole: (id: number, role: string) => api.put(`/admin/users/${id}/role`, { role }),
  createUser: (data: { username: string; password: string; display_name?: string; email?: string; role?: string }) =>
    api.post<{ success: boolean; message: string }>('/admin/users', data),
  batchDeleteUsers: (ids: number[]) =>
    api.delete<{ success: boolean; message: string; skipped: number }>('/admin/users/batch', { data: { ids } }),
  batchBanUsers: (ids: number[], ban: boolean, opts?: { duration?: number; reason?: string }) =>
    api.put<{ success: boolean; message: string; skipped: number }>('/admin/users/batch/ban', { ids, ban, ...opts }),
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

  // ── 团队独立帖子（team_content_posts）────
  getTeamContentPosts: (id: number, page?: number) => api.get<{ posts: TeamContentPost[]; page: number; limit: number }>(`/teams/${id}/content-posts`, { params: { page } }),
  createTeamContentPost: (id: number, data: { title: string; content: string; images?: string[] }) => api.post<{ success: boolean; post: TeamContentPost }>(`/teams/${id}/content-posts`, data),
  getTeamContentPost: (teamId: number, postId: number) => api.get<TeamContentPost>(`/teams/${teamId}/content-posts/${postId}`),
  updateTeamContentPost: (teamId: number, postId: number, data: { title?: string; content?: string; images?: string[]; isPinned?: boolean }) => api.put<{ success: boolean; message: string }>(`/teams/${teamId}/content-posts/${postId}`, data),
  deleteTeamContentPost: (teamId: number, postId: number) => api.delete<{ success: boolean; message: string }>(`/teams/${teamId}/content-posts/${postId}`),

  // ── 团队文件 ──────────────────────────
  getTeamFiles: (id: number) => api.get<{ files: TeamFile[] }>(`/teams/${id}/files`),
  uploadTeamFile: (id: number, data: { name: string; mimeType: string; data?: string; ossKey?: string; size?: number }) => api.post<{ success: boolean; file: TeamFile }>(`/teams/${id}/files`, data),
  deleteTeamFile: (teamId: number, fileId: number) => api.delete<{ success: boolean; message: string }>(`/teams/${teamId}/files/${fileId}`),
  getTeamFileDownloadUrl: (teamId: number, fileId: number) => `/api/teams/${teamId}/files/${fileId}/download`,

  // ── 团队评论 ──────────────────────────
  getComments: (teamId: number, postId: number) => api.get<{ comments: TeamContentComment[] }>(`/teams/${teamId}/content-posts/${postId}/comments`),
  createComment: (teamId: number, postId: number, content: string) => api.post<{ success: boolean; comment: TeamContentComment }>(`/teams/${teamId}/content-posts/${postId}/comments`, { content }),
  deleteComment: (teamId: number, postId: number, commentId: number) => api.delete<{ success: boolean; message: string }>(`/teams/${teamId}/content-posts/${postId}/comments/${commentId}`),

  // ── OSS 直传 ──────────────────────────
  getOssUploadUrl: (teamId: number, name: string) => api.post<{ uploadUrl: string; ossKey: string }>('/oss/upload-url', { teamId, name }),
  getOssSignUrl: (key: string) => api.get<{ downloadUrl: string }>('/oss/sign-url', { params: { key } }),
};

export default api;

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

// ===== 管理员设备管理 API =====
export const adminDeviceApi = {
  getBlacklist: () => api.get<{ devices: DeviceBlacklistEntry[] }>('/admin/device-blacklist'),
  addToBlacklist: (deviceId: string, deviceName?: string, reason?: string) => api.post<{ success: boolean }>('/admin/device-blacklist', { device_id: deviceId, device_name: deviceName, reason }),
  removeFromBlacklist: (id: number) => api.delete(`/admin/device-blacklist/${id}`),
  getAllDevices: (userId?: number) => api.get<{ devices: (UserDevice & { username?: string })[] }>('/admin/devices', { params: userId ? { user_id: userId } : {} }),
};

// ===== 编辑历史 API =====
export const versionApi = {
  getVersions: (postId: number) => api.get<{ versions: PostVersion[] }>(`/posts/${postId}/versions`),
};

// ===== 评论 API =====
export const commentApi = {
  update: (commentId: number, content: string) => api.put<{ success: boolean }>(`/comments/${commentId}`, { content }),
};

// ===== 我的设备 API =====
export const userDeviceApi = {
  getMyDevices: () => api.get<{ devices: (UserDevice & { is_current?: boolean })[] }>('/my-devices'),
  revokeDevice: (id: number) => api.delete<{ success: boolean }>(`/my-devices/${id}`),
};
