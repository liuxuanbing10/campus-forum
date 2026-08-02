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
  is_read?: number;
  sender_name?: string;
  sender_avatar?: string;
}
