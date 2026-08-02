export interface Achievement {
  id: number;
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  points: number;
  condition_desc: string;
  sort_order: number;
}

export interface UserAchievement {
  id: number;
  user_id: number;
  achievement_id: number;
  unlocked_at: string;
  achievement?: Achievement;
}
