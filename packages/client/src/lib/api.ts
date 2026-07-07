import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // 不自动跳转，让页面自己处理
    }
    return Promise.reject(error);
  }
);

export interface Team {
  id: number;
  name: string;
  description: string;
  avatar: string | null;
  is_public: number;
  creator_id: number;
  max_members: number;
  member_count: number;
  created_at: string;
  updated_at: string;
  myRole: string | null;
  myApplicationStatus: string | null;
}

export interface TeamMember {
  id: number;
  team_id: number;
  user_id: number;
  role: string;
  status: string;
  username: string;
  joined_at: string;
}

export interface CreateTeamData {
  name: string;
  description?: string;
  avatar?: string;
  isPublic?: boolean;
  maxMembers?: number;
}

export interface UpdateTeamData {
  name?: string;
  description?: string;
  avatar?: string;
  isPublic?: boolean;
  maxMembers?: number;
}

export const teamsApi = {
  getMyTeams: () => api.get<{ teams: Team[] }>('/teams/my'),
  getTeams: (page?: number) => api.get<{ teams: Team[]; page: number; limit: number }>('/teams', { params: { page } }),
  searchTeams: (q: string) => api.get<{ teams: Team[] }>('/teams/search', { params: { q } }),
  getTeam: (id: number) => api.get<Team>(`/teams/${id}`),
  getTeamStats: (id: number) => api.get<{ memberCount: number; pendingCount: number }>(`/teams/${id}/stats`),
  getTeamMembers: (id: number) => api.get<{ members: TeamMember[] }>(`/teams/${id}/members`),
  getTeamApplications: (id: number) => api.get<{ applications: TeamMember[] }>(`/teams/${id}/applications`),
  createTeam: (data: CreateTeamData) => api.post<{ success: boolean; team: Team }>('/teams', data),
  updateTeam: (id: number, data: UpdateTeamData) => api.put<{ success: boolean; message: string }>(`/teams/${id}`, data),
  deleteTeam: (id: number) => api.delete<{ success: boolean; message: string }>(`/teams/${id}`),
  joinTeam: (id: number) => api.post<{ success: boolean; message: string }>(`/teams/${id}/join`),
  leaveTeam: (id: number) => api.post<{ success: boolean; message: string }>(`/teams/${id}/leave`),
  approveMember: (teamId: number, userId: number) => api.put<{ success: boolean; message: string }>(`/teams/${teamId}/members/${userId}`, { action: 'approve' }),
  rejectMember: (teamId: number, userId: number) => api.put<{ success: boolean; message: string }>(`/teams/${teamId}/members/${userId}`, { action: 'reject' }),
  removeMember: (teamId: number, userId: number) => api.delete<{ success: boolean; message: string }>(`/teams/${teamId}/members/${userId}`),
};

export default api;
