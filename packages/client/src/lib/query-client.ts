import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,           // 30s 内不重取
      gcTime: 5 * 60 * 1000,          // 5min 后 GC
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

// ── Query keys（统一管理，防散乱）──
export const QK = {
  posts: {
    list: (sort: string, page: number) => ['posts', 'list', sort, page] as const,
    detail: (id: number) => ['posts', 'detail', id] as const,
    stats: (id: number) => ['posts', 'stats', id] as const,
    versions: (id: number) => ['posts', 'versions', id] as const,
  },
  boards: {
    list: () => ['boards'] as const,
  },
  teams: {
    list: () => ['teams', 'list'] as const,
    my: () => ['teams', 'my'] as const,
    detail: (id: number) => ['teams', 'detail', id] as const,
  },
  notifications: {
    list: (page: number) => ['notifications', page] as const,
    unreadCount: () => ['notifications', 'unread'] as const,
  },
  messages: {
    conversations: () => ['messages', 'conversations'] as const,
    detail: (id: number) => ['messages', 'detail', id] as const,
  },
  favorites: {
    list: (page: number) => ['favorites', page] as const,
  },
  admin: {
    users: (page: number) => ['admin', 'users', page] as const,
    posts: (page: number) => ['admin', 'posts', page] as const,
    reports: () => ['admin', 'reports'] as const,
    stats: () => ['admin', 'stats'] as const,
  },
  user: {
    profile: (id: number) => ['user', 'profile', id] as const,
    posts: (id: number) => ['user', 'posts', id] as const,
  },
  search: {
    results: (q: string, page: number) => ['search', q, page] as const,
  },
} as const;
