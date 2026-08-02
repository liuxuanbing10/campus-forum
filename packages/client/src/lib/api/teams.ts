import api from './client';
import type { TeamCategory, Team, TeamMember, TeamAnnouncement, TeamPost, TeamContentPost, TeamFile, TeamContentComment, MyTeamsResponse, CreateTeamData, UpdateTeamData } from '@campus-forum/core';

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
