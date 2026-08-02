export interface AdminUser {
  id: number;
  username: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: number;
  is_banned: number;
  role: string;
  created_at: string;
  device_code: string | null;
  post_count: number;
  comment_count: number;
}

export interface ReportData {
  target_type: 'post' | 'comment';
  target_id: number;
  reason: string;
  description?: string;
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

export interface CaptchaData {
  captchaId: string;
  imageBase64?: string;
  question?: string;
}

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
